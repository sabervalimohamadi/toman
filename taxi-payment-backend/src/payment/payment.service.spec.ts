process.env['MONGOMS_SYSTEM_BINARY'] =
  'C:\\Program Files\\MongoDB\\Server\\8.3\\bin\\mongod.exe';

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken, MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

import { PaymentService } from './payment.service';
import { Payment, PaymentSchema, PaymentDocument, PaymentStatus } from './schemas/payment.schema';
import { DriverCode, DriverCodeSchema, DriverCodeDocument } from './schemas/driver-code.schema';
import { WalletService } from '../wallet/wallet.service';
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema';
import { Transaction, TransactionSchema } from '../wallet/schemas/transaction.schema';
import { UsersService } from '../users/users.service';
import { User, UserSchema, UserDocument, UserRole } from '../users/schemas/user.schema';

describe('PaymentService', () => {
  let service: PaymentService;
  let walletService: WalletService;
  let mongod: MongoMemoryReplSet;
  let module: TestingModule;
  let dbConnection: Connection;

  let userModel: Model<UserDocument>;
  let paymentModel: Model<PaymentDocument>;
  let driverCodeModel: Model<DriverCodeDocument>;

  let passengerId: string;
  let driverId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: Wallet.name, schema: WalletSchema },
          { name: Transaction.name, schema: TransactionSchema },
          { name: Payment.name, schema: PaymentSchema },
          { name: DriverCode.name, schema: DriverCodeSchema },
        ]),
      ],
      providers: [PaymentService, WalletService, UsersService],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    walletService = module.get<WalletService>(WalletService);
    dbConnection = module.get<Connection>(getConnectionToken());
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    paymentModel = module.get<Model<PaymentDocument>>(getModelToken(Payment.name));
    driverCodeModel = module.get<Model<DriverCodeDocument>>(getModelToken(DriverCode.name));
  }, 60_000);

  afterAll(async () => {
    await module.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    for (const col of Object.values(dbConnection.collections)) {
      await col.deleteMany({});
    }

    const passenger = await userModel.create({ phone: '09100000001', role: UserRole.PASSENGER });
    passengerId = passenger.id as string;
    await walletService.getOrCreateWallet(passengerId);
    await walletService.topUp(passengerId, 100_000);

    const driver = await userModel.create({ phone: '09100000002', role: UserRole.DRIVER });
    driverId = driver.id as string;
    await walletService.getOrCreateWallet(driverId);
  });

  // ─── generateQRToken ───────────────────────────────────────────────────────

  describe('generateQRToken', () => {
    it('returns a token with correct driverId and future expiry', async () => {
      const result = await service.generateQRToken(driverId, { expiresInSeconds: 300 });

      expect(result.token).toBeDefined();
      expect(result.driverId).toBe(driverId);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('uses default 300-second expiry when not specified', async () => {
      const before = Date.now();
      const result = await service.generateQRToken(driverId, {});
      const after = Date.now();

      const expectedMin = before + 299_000;
      const expectedMax = after + 301_000;
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
    });

    it('throws ForbiddenException when a passenger tries to generate a QR', async () => {
      await expect(service.generateQRToken(passengerId, {})).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getOrCreateDriverCode ────────────────────────────────────────────────

  describe('getOrCreateDriverCode', () => {
    it('creates a 6-character alphanumeric code for a driver', async () => {
      const result = await service.getOrCreateDriverCode(driverId);

      expect(result.code).toMatch(/^[A-Z0-9]{6}$/);
      expect(result.driverId).toBe(driverId);
      expect(result.isActive).toBe(true);
    });

    it('returns the same code on subsequent calls', async () => {
      const r1 = await service.getOrCreateDriverCode(driverId);
      const r2 = await service.getOrCreateDriverCode(driverId);

      expect(r1.code).toBe(r2.code);
      expect(r1.id).toBe(r2.id);
    });

    it('throws ForbiddenException when a passenger tries to get a driver code', async () => {
      await expect(service.getOrCreateDriverCode(passengerId)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── payByQR ──────────────────────────────────────────────────────────────

  describe('payByQR', () => {
    let qrToken: string;

    beforeEach(async () => {
      const result = await service.generateQRToken(driverId, { expiresInSeconds: 300 });
      qrToken = result.token;
    });

    it('transfers amount from passenger to driver and returns newBalance', async () => {
      const result = await service.payByQR(passengerId, { qrToken, amount: 20_000 });

      expect(result.payment.status).toBe(PaymentStatus.SUCCESS);
      expect(result.payment.amount).toBe(20_000);
      expect(result.newBalance).toBe(80_000);

      const { balance: driverBalance } = await walletService.getBalance(driverId);
      expect(driverBalance).toBe(20_000);
    });

    it('records payment with correct passengerId, driverId, method = qr', async () => {
      const result = await service.payByQR(passengerId, { qrToken, amount: 5_000 });

      expect(result.payment.passengerId).toBe(passengerId);
      expect(result.payment.driverId).toBe(driverId);
      expect(result.payment.method).toBe('qr');
    });

    it('deducts from passenger wallet', async () => {
      await service.payByQR(passengerId, { qrToken, amount: 30_000 });

      const { balance } = await walletService.getBalance(passengerId);
      expect(balance).toBe(70_000);
    });

    it('adds amount to driver wallet', async () => {
      await service.payByQR(passengerId, { qrToken, amount: 15_000 });

      const { balance } = await walletService.getBalance(driverId);
      expect(balance).toBe(15_000);
    });

    it('throws BadRequestException for an invalid (unknown) QR token', async () => {
      await expect(
        service.payByQR(passengerId, { qrToken: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', amount: 1_000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when a driver (not a passenger) tries to pay by QR', async () => {
      await expect(
        service.payByQR(driverId, { qrToken, amount: 1_000 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException and marks payment failed on insufficient balance', async () => {
      const result = await service.payByQR(passengerId, { qrToken, amount: 200_000 }).catch((e: unknown) => e);

      expect(result).toBeInstanceOf(BadRequestException);

      const payments = await paymentModel.find({ passengerId }).exec();
      expect(payments.every((p) => p.status === PaymentStatus.FAILED)).toBe(true);
    });

    it('does NOT consume the QR token on failure (token still usable)', async () => {
      await service.payByQR(passengerId, { qrToken, amount: 200_000 }).catch(() => undefined);

      const retryResult = await service.payByQR(passengerId, { qrToken, amount: 5_000 });
      expect(retryResult.payment.status).toBe(PaymentStatus.SUCCESS);
    });
  });

  // ─── payByCode ────────────────────────────────────────────────────────────

  describe('payByCode', () => {
    let driverCode: string;

    beforeEach(async () => {
      const result = await service.getOrCreateDriverCode(driverId);
      driverCode = result.code;
    });

    it('transfers amount from passenger to driver correctly', async () => {
      const result = await service.payByCode(passengerId, { driverCode, amount: 10_000 });

      expect(result.payment.status).toBe(PaymentStatus.SUCCESS);
      expect(result.newBalance).toBe(90_000);

      const { balance: driverBalance } = await walletService.getBalance(driverId);
      expect(driverBalance).toBe(10_000);
    });

    it('throws NotFoundException for an unknown driver code', async () => {
      await expect(
        service.payByCode(passengerId, { driverCode: 'XXXXXX', amount: 1_000 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException and marks payment failed on insufficient balance', async () => {
      const result = await service.payByCode(passengerId, { driverCode, amount: 500_000 }).catch((e: unknown) => e);

      expect(result).toBeInstanceOf(BadRequestException);

      const payments = await paymentModel.find({ passengerId }).exec();
      expect(payments.every((p) => p.status === PaymentStatus.FAILED)).toBe(true);
    });

    it('accepts lowercase driver code input (case-insensitive)', async () => {
      const result = await service.payByCode(passengerId, {
        driverCode: driverCode.toLowerCase(),
        amount: 5_000,
      });
      expect(result.payment.status).toBe(PaymentStatus.SUCCESS);
    });
  });

  // ─── getPaymentHistory ────────────────────────────────────────────────────

  describe('getPaymentHistory', () => {
    beforeEach(async () => {
      const { code } = await service.getOrCreateDriverCode(driverId);
      await service.payByCode(passengerId, { driverCode: code, amount: 5_000 });
      await service.payByCode(passengerId, { driverCode: code, amount: 3_000 });
    });

    it('returns paginated history for a passenger', async () => {
      const result = await service.getPaymentHistory(passengerId, { page: 1, limit: 10 });

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('returns paginated history for a driver', async () => {
      const result = await service.getPaymentHistory(driverId, { page: 1, limit: 10 });

      expect(result.total).toBe(2);
    });

    it('filters by status correctly', async () => {
      const result = await service.getPaymentHistory(passengerId, {
        page: 1,
        limit: 10,
        status: PaymentStatus.SUCCESS,
      });

      expect(result.total).toBe(2);
      result.items.forEach((p) => expect(p.status).toBe(PaymentStatus.SUCCESS));
    });
  });

  // ─── getPaymentById ───────────────────────────────────────────────────────

  describe('getPaymentById', () => {
    let paymentId: string;

    beforeEach(async () => {
      const { code } = await service.getOrCreateDriverCode(driverId);
      const result = await service.payByCode(passengerId, { driverCode: code, amount: 7_000 });
      paymentId = result.payment.id;
    });

    it('returns the payment when queried by the passenger', async () => {
      const result = await service.getPaymentById(passengerId, paymentId);

      expect(result.id).toBe(paymentId);
      expect(result.amount).toBe(7_000);
    });

    it('returns the payment when queried by the driver', async () => {
      const result = await service.getPaymentById(driverId, paymentId);

      expect(result.id).toBe(paymentId);
    });

    it('throws NotFoundException when an unrelated user queries the payment', async () => {
      const unrelated = await userModel.create({ phone: '09100000099', role: UserRole.PASSENGER });
      await walletService.getOrCreateWallet(unrelated.id as string);
      await walletService.topUp(unrelated.id as string, 10_000);

      await expect(
        service.getPaymentById(unrelated.id as string, paymentId),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for an invalid paymentId', async () => {
      await expect(
        service.getPaymentById(passengerId, 'not-a-valid-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
