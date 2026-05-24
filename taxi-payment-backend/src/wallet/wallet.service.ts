import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import {
  Transaction,
  TransactionDocument,
  TransactionType,
  TransactionStatus,
} from './schemas/transaction.schema';
import type {
  IWallet,
  ITransaction,
  ITopUpResult,
  IDeductResult,
  IPaginatedTransactions,
  IWalletService,
} from './interfaces/wallet.interfaces';
import type { GetTransactionsDto } from './dto/get-transactions.dto';

@Injectable()
export class WalletService implements IWalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async getOrCreateWallet(userId: string): Promise<IWallet> {
    const userObjectId = new Types.ObjectId(userId);
    const wallet = await this.walletModel
      .findOneAndUpdate(
        { userId: userObjectId },
        { $setOnInsert: { userId: userObjectId, balance: 0, isActive: true } },
        { upsert: true, new: true },
      )
      .exec();
    return this.mapWallet(wallet!);
  }

  async getBalance(userId: string): Promise<{ balance: number; userId: string }> {
    const wallet = await this.getOrCreateWallet(userId);
    return { balance: wallet.balance, userId };
  }

  async topUp(userId: string, amount: number, referenceId?: string): Promise<ITopUpResult> {
    const session = await this.connection.startSession();
    let result!: ITopUpResult;

    try {
      await session.withTransaction(async () => {
        const userObjectId = new Types.ObjectId(userId);

        const walletBefore = await this.walletModel
          .findOneAndUpdate(
            { userId: userObjectId },
            {
              $inc: { balance: amount },
              $setOnInsert: { isActive: true },
            },
            { session, new: false, upsert: true },
          )
          .exec();

        const balanceBefore = walletBefore?.balance ?? 0;
        const balanceAfter = balanceBefore + amount;

        const updatedWallet = await this.walletModel
          .findOne({ userId: userObjectId }, null, { session })
          .exec();

        const [txn] = await this.transactionModel.create(
          [
            {
              walletId: updatedWallet!._id,
              userId: userObjectId,
              type: TransactionType.DEPOSIT,
              amount,
              balanceBefore,
              balanceAfter,
              referenceId,
              status: TransactionStatus.SUCCESS,
            },
          ],
          { session },
        );

        result = {
          wallet: this.mapWallet(updatedWallet!),
          transaction: this.mapTransaction(txn),
        };
      });
    } finally {
      await session.endSession();
    }

    return result;
  }

  async deduct(
    userId: string,
    amount: number,
    referenceId?: string,
    description?: string,
  ): Promise<IDeductResult> {
    const session = await this.connection.startSession();
    let result!: IDeductResult;
    let insufficientBalance = false;

    try {
      await session.withTransaction(async () => {
        const userObjectId = new Types.ObjectId(userId);

        const walletBefore = await this.walletModel
          .findOneAndUpdate(
            { userId: userObjectId, balance: { $gte: amount }, isActive: true },
            { $inc: { balance: -amount } },
            { session, new: false },
          )
          .exec();

        if (!walletBefore) {
          insufficientBalance = true;
          // Abort by throwing — withTransaction will NOT retry non-transient errors
          throw new Error('INSUFFICIENT_BALANCE');
        }

        const balanceBefore = walletBefore.balance;
        const balanceAfter = balanceBefore - amount;

        const updatedWallet = await this.walletModel
          .findById(walletBefore._id, null, { session })
          .exec();

        const [txn] = await this.transactionModel.create(
          [
            {
              walletId: walletBefore._id,
              userId: userObjectId,
              type: TransactionType.DEDUCT,
              amount,
              balanceBefore,
              balanceAfter,
              referenceId,
              description,
              status: TransactionStatus.SUCCESS,
            },
          ],
          { session },
        );

        result = {
          wallet: this.mapWallet(updatedWallet!),
          transaction: this.mapTransaction(txn),
        };
      });
    } catch (err) {
      if (insufficientBalance) {
        const existing = await this.walletModel
          .findOne({ userId: new Types.ObjectId(userId) })
          .exec();
        this.logger.warn(
          `Deduct failed — userId=${userId}, requested=${amount}, balance=${existing?.balance ?? 0}`,
        );
        throw new BadRequestException('موجودی کیف پول کافی نیست');
      }
      throw err;
    } finally {
      await session.endSession();
    }

    return result;
  }

  async refund(
    userId: string,
    amount: number,
    referenceId?: string,
    description?: string,
  ): Promise<ITopUpResult> {
    const session = await this.connection.startSession();
    let result!: ITopUpResult;

    try {
      await session.withTransaction(async () => {
        const userObjectId = new Types.ObjectId(userId);

        const walletBefore = await this.walletModel
          .findOneAndUpdate(
            { userId: userObjectId },
            {
              $inc: { balance: amount },
              $setOnInsert: { isActive: true },
            },
            { session, new: false, upsert: true },
          )
          .exec();

        const balanceBefore = walletBefore?.balance ?? 0;
        const balanceAfter = balanceBefore + amount;

        const updatedWallet = await this.walletModel
          .findOne({ userId: userObjectId }, null, { session })
          .exec();

        const [txn] = await this.transactionModel.create(
          [
            {
              walletId: updatedWallet!._id,
              userId: userObjectId,
              type: TransactionType.REFUND,
              amount,
              balanceBefore,
              balanceAfter,
              referenceId,
              description,
              status: TransactionStatus.SUCCESS,
            },
          ],
          { session },
        );

        result = {
          wallet: this.mapWallet(updatedWallet!),
          transaction: this.mapTransaction(txn),
        };
      });
    } finally {
      await session.endSession();
    }

    return result;
  }

  async getTransactions(userId: string, dto: GetTransactionsDto): Promise<IPaginatedTransactions> {
    const { page, limit, type, startDate, endDate } = dto;
    const userObjectId = new Types.ObjectId(userId);

    const filter: Record<string, unknown> = { userId: userObjectId };

    if (type) filter['type'] = type;

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter['$gte'] = new Date(startDate);
      if (endDate) dateFilter['$lte'] = new Date(endDate);
      filter['createdAt'] = dateFilter;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.transactionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.transactionModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((t) => this.mapTransaction(t)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private mapWallet(doc: WalletDocument): IWallet {
    return {
      id: doc.id as string,
      userId: doc.userId.toString(),
      balance: doc.balance,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private mapTransaction(doc: TransactionDocument): ITransaction {
    return {
      id: doc.id as string,
      walletId: doc.walletId.toString(),
      userId: doc.userId.toString(),
      type: doc.type,
      amount: doc.amount,
      balanceBefore: doc.balanceBefore,
      balanceAfter: doc.balanceAfter,
      description: doc.description,
      referenceId: doc.referenceId,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
