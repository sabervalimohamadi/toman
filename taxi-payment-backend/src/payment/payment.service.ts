import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Payment, PaymentDocument, PaymentStatus, PaymentMethod } from './schemas/payment.schema';
import { DriverCode, DriverCodeDocument } from './schemas/driver-code.schema';
import { WalletService } from '../wallet/wallet.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/schemas/user.schema';
import type {
  IPayment,
  IDriverCode,
  IQRToken,
  IQRPaymentResult,
  IManualPaymentResult,
  IPaginatedPayments,
  IPaymentService,
} from './interfaces/payment.interfaces';
import type { GetPaymentsDto } from './dto/get-payments.dto';

@Injectable()
export class PaymentService implements IPaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly qrTokens = new Map<string, IQRToken>();

  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(DriverCode.name) private readonly driverCodeModel: Model<DriverCodeDocument>,
    private readonly walletService: WalletService,
    private readonly usersService: UsersService,
  ) {}

  // ─── QR Token ──────────────────────────────────────────────────────────────

  async generateQRToken(
    driverId: string,
    dto: { expiresInSeconds?: number },
  ): Promise<IQRToken> {
    const driver = await this.usersService.findById(driverId);
    if (driver.role !== UserRole.DRIVER) {
      throw new ForbiddenException('فقط رانندگان می‌توانند کد QR تولید کنند');
    }

    const seconds = dto.expiresInSeconds ?? 300;
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + seconds * 1000);
    const tokenData: IQRToken = { token, driverId, expiresAt };

    this.qrTokens.set(token, tokenData);
    setTimeout(() => this.qrTokens.delete(token), seconds * 1000);

    return tokenData;
  }

  // ─── Driver Code ───────────────────────────────────────────────────────────

  async getOrCreateDriverCode(driverId: string): Promise<IDriverCode> {
    const driver = await this.usersService.findById(driverId);
    if (driver.role !== UserRole.DRIVER) {
      throw new ForbiddenException('فقط رانندگان می‌توانند کد دریافت کنند');
    }

    const existing = await this.driverCodeModel
      .findOne({ driverId: new Types.ObjectId(driverId) })
      .exec();
    if (existing) return this.mapDriverCode(existing);

    let code: string;
    let collision: boolean;
    do {
      code = this.generateRandomCode(6);
      collision = !!(await this.driverCodeModel.findOne({ code }).exec());
    } while (collision);

    const driverCode = await this.driverCodeModel.create({
      driverId: new Types.ObjectId(driverId),
      code,
      isActive: true,
    });

    return this.mapDriverCode(driverCode);
  }

  // ─── Pay by QR ─────────────────────────────────────────────────────────────

  async payByQR(
    passengerId: string,
    dto: { qrToken: string; amount: number },
  ): Promise<IQRPaymentResult> {
    const tokenData = this.qrTokens.get(dto.qrToken);
    if (!tokenData) {
      throw new BadRequestException('کد QR نامعتبر است');
    }
    if (tokenData.expiresAt < new Date()) {
      this.qrTokens.delete(dto.qrToken);
      throw new BadRequestException('کد QR منقضی شده است');
    }

    const passenger = await this.usersService.findById(passengerId);
    if (passenger.role !== UserRole.PASSENGER) {
      throw new ForbiddenException('فقط مسافران می‌توانند پرداخت کنند');
    }

    const driverId = tokenData.driverId;
    if (passengerId === driverId) {
      throw new BadRequestException('مسافر و راننده نمی‌توانند یکی باشند');
    }

    const payment = await this.paymentModel.create({
      passengerId: new Types.ObjectId(passengerId),
      driverId: new Types.ObjectId(driverId),
      amount: dto.amount,
      status: PaymentStatus.PENDING,
      method: PaymentMethod.QR,
      qrToken: dto.qrToken,
    });

    return this.executePayment(payment, passengerId, driverId, dto.amount, () => {
      this.qrTokens.delete(dto.qrToken);
    });
  }

  // ─── Pay by Code ───────────────────────────────────────────────────────────

  async payByCode(
    passengerId: string,
    dto: { driverCode: string; amount: number },
  ): Promise<IManualPaymentResult> {
    const codeRecord = await this.driverCodeModel
      .findOne({ code: dto.driverCode.toUpperCase(), isActive: true })
      .exec();
    if (!codeRecord) {
      throw new NotFoundException('کد راننده یافت نشد');
    }

    const passenger = await this.usersService.findById(passengerId);
    if (passenger.role !== UserRole.PASSENGER) {
      throw new ForbiddenException('فقط مسافران می‌توانند پرداخت کنند');
    }

    const driverId = codeRecord.driverId.toString();
    if (passengerId === driverId) {
      throw new BadRequestException('مسافر و راننده نمی‌توانند یکی باشند');
    }

    const payment = await this.paymentModel.create({
      passengerId: new Types.ObjectId(passengerId),
      driverId: new Types.ObjectId(driverId),
      amount: dto.amount,
      status: PaymentStatus.PENDING,
      method: PaymentMethod.MANUAL_CODE,
      driverCode: dto.driverCode.toUpperCase(),
    });

    return this.executePayment(payment, passengerId, driverId, dto.amount);
  }

  // ─── History ───────────────────────────────────────────────────────────────

  async getPaymentHistory(userId: string, dto: GetPaymentsDto): Promise<IPaginatedPayments> {
    const { page, limit, status, method, startDate, endDate } = dto;
    const userObjectId = new Types.ObjectId(userId);

    const filter: Record<string, unknown> = {
      $or: [{ passengerId: userObjectId }, { driverId: userObjectId }],
    };

    if (status) filter['status'] = status;
    if (method) filter['method'] = method;

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter['$gte'] = new Date(startDate);
      if (endDate) dateFilter['$lte'] = new Date(endDate);
      filter['createdAt'] = dateFilter;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.paymentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((p) => this.mapPayment(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPaymentById(userId: string, paymentId: string): Promise<IPayment> {
    if (!Types.ObjectId.isValid(paymentId)) {
      throw new NotFoundException('پرداخت یافت نشد');
    }
    const payment = await this.paymentModel.findById(paymentId).exec();
    if (
      !payment ||
      (payment.passengerId.toString() !== userId && payment.driverId.toString() !== userId)
    ) {
      throw new NotFoundException('پرداخت یافت نشد');
    }
    return this.mapPayment(payment);
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  /**
   * Core payment execution: deduct from passenger, top up driver, update payment doc.
   * On deduct failure: marks payment 'failed' and rethrows.
   * On topUp failure: issues compensating refund, marks payment 'failed', rethrows.
   */
  private async executePayment(
    payment: PaymentDocument,
    passengerId: string,
    driverId: string,
    amount: number,
    onSuccess?: () => void,
  ): Promise<IQRPaymentResult> {
    let deductResult;

    try {
      deductResult = await this.walletService.deduct(
        passengerId,
        amount,
        `pay:${payment.id as string}`,
        'پرداخت کرایه',
      );
    } catch (err) {
      await this.paymentModel
        .findByIdAndUpdate(payment._id, {
          status: PaymentStatus.FAILED,
          failureReason: err instanceof Error ? err.message : 'Deduct failed',
        })
        .exec();
      this.logger.warn(
        `Payment ${payment.id as string} failed at deduct — passengerId=${passengerId}, amount=${amount}`,
      );
      throw err;
    }

    try {
      await this.walletService.topUp(driverId, amount, `pay:${payment.id as string}:topup`);
    } catch (err) {
      this.logger.error(
        `Payment ${payment.id as string} topUp failed — driverId=${driverId}, amount=${amount}. Issuing refund.`,
      );
      await this.walletService
        .refund(passengerId, amount, `refund:${payment.id as string}`, 'استرداد کرایه')
        .catch((refundErr: unknown) =>
          this.logger.error(`Refund failed for payment ${payment.id as string}: ${String(refundErr)}`),
        );
      await this.paymentModel
        .findByIdAndUpdate(payment._id, {
          status: PaymentStatus.FAILED,
          failureReason: err instanceof Error ? err.message : 'TopUp failed',
        })
        .exec();
      throw new BadRequestException('خطا در انجام پرداخت');
    }

    const updated = await this.paymentModel
      .findByIdAndUpdate(
        payment._id,
        {
          status: PaymentStatus.SUCCESS,
          paidAt: new Date(),
          walletTransactionId: new Types.ObjectId(deductResult.transaction.id),
        },
        { new: true },
      )
      .exec();

    if (onSuccess) onSuccess();

    return {
      payment: this.mapPayment(updated!),
      newBalance: deductResult.wallet.balance,
    };
  }

  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private mapPayment(doc: PaymentDocument): IPayment {
    return {
      id: doc.id as string,
      passengerId: doc.passengerId.toString(),
      driverId: doc.driverId.toString(),
      amount: doc.amount,
      status: doc.status,
      method: doc.method,
      qrToken: doc.qrToken,
      driverCode: doc.driverCode,
      failureReason: doc.failureReason,
      paidAt: doc.paidAt,
      refundedAt: doc.refundedAt,
      walletTransactionId: doc.walletTransactionId?.toString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private mapDriverCode(doc: DriverCodeDocument): IDriverCode {
    return {
      id: doc.id as string,
      driverId: doc.driverId.toString(),
      code: doc.code,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
