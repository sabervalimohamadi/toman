import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Model, Connection } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { WalletService } from './wallet.service';
import { Wallet, WalletSchema, WalletDocument } from './schemas/wallet.schema';
import { Transaction, TransactionSchema, TransactionDocument } from './schemas/transaction.schema';
import { User, UserSchema, UserDocument } from '../users/schemas/user.schema';
import { GetTransactionsDto } from './dto/get-transactions.dto';

// Use the system-installed MongoDB binary to skip the ~600 MB download.
process.env['MONGOMS_SYSTEM_BINARY'] =
  'C:\\Program Files\\MongoDB\\Server\\8.3\\bin\\mongod.exe';

describe('WalletService', () => {
  let service: WalletService;
  let mongod: MongoMemoryReplSet;
  let module: TestingModule;
  let dbConnection: Connection;
  let userModel: Model<UserDocument>;
  let transactionModel: Model<TransactionDocument>;
  let testUserId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([
          { name: Wallet.name, schema: WalletSchema },
          { name: Transaction.name, schema: TransactionSchema },
          { name: User.name, schema: UserSchema },
        ]),
      ],
      providers: [WalletService],
    }).compile();

    service = module.get<WalletService>(WalletService);
    dbConnection = module.get<Connection>(getConnectionToken());
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    transactionModel = module.get<Model<TransactionDocument>>(getModelToken(Transaction.name));
  }, 60_000);

  afterAll(async () => {
    await module.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    for (const col of Object.values(dbConnection.collections)) {
      await col.deleteMany({});
    }

    const user = await userModel.create({ phone: '09123456789', role: 'passenger' });
    testUserId = user.id as string;

    await service.getOrCreateWallet(testUserId);
  });

  // ─── getOrCreateWallet ───────────────────────────────────────────────────

  describe('getOrCreateWallet', () => {
    it('creates a wallet on first call', async () => {
      const newUser = await userModel.create({ phone: '09999999999', role: 'passenger' });
      const wallet = await service.getOrCreateWallet(newUser.id as string);

      expect(wallet.id).toBeDefined();
      expect(wallet.balance).toBe(0);
      expect(wallet.isActive).toBe(true);
    });

    it('returns the same wallet on subsequent calls', async () => {
      const w1 = await service.getOrCreateWallet(testUserId);
      const w2 = await service.getOrCreateWallet(testUserId);

      expect(w1.id).toBe(w2.id);
    });
  });

  // ─── topUp ───────────────────────────────────────────────────────────────

  describe('topUp', () => {
    it('increases balance correctly', async () => {
      const result = await service.topUp(testUserId, 10000);

      expect(result.wallet.balance).toBe(10000);
    });

    it('records transaction with correct balanceBefore and balanceAfter', async () => {
      await service.topUp(testUserId, 5000);
      const result = await service.topUp(testUserId, 3000);

      expect(result.transaction.balanceBefore).toBe(5000);
      expect(result.transaction.balanceAfter).toBe(8000);
      expect(result.transaction.type).toBe('deposit');
      expect(result.transaction.amount).toBe(3000);
    });
  });

  // ─── deduct ──────────────────────────────────────────────────────────────

  describe('deduct', () => {
    beforeEach(async () => {
      await service.topUp(testUserId, 20000);
    });

    it('decreases balance correctly', async () => {
      const result = await service.deduct(testUserId, 5000);

      expect(result.wallet.balance).toBe(15000);
      expect(result.transaction.type).toBe('deduct');
      expect(result.transaction.balanceBefore).toBe(20000);
      expect(result.transaction.balanceAfter).toBe(15000);
    });

    it('throws BadRequestException when balance is insufficient', async () => {
      await expect(service.deduct(testUserId, 99999)).rejects.toThrow(BadRequestException);
    });

    it('does NOT create a transaction when balance is insufficient', async () => {
      const countBefore = await transactionModel.countDocuments({ userId: testUserId });

      await service.deduct(testUserId, 99999).catch(() => undefined);

      const countAfter = await transactionModel.countDocuments({ userId: testUserId });
      expect(countAfter).toBe(countBefore);
    });
  });

  // ─── refund ──────────────────────────────────────────────────────────────

  describe('refund', () => {
    it('increases balance and records type = refund', async () => {
      const result = await service.refund(testUserId, 7500, 'ref-001', 'refund for order');

      expect(result.wallet.balance).toBe(7500);
      expect(result.transaction.type).toBe('refund');
      expect(result.transaction.referenceId).toBe('ref-001');
      expect(result.transaction.description).toBe('refund for order');
    });
  });

  // ─── getTransactions ─────────────────────────────────────────────────────

  describe('getTransactions', () => {
    beforeEach(async () => {
      await service.topUp(testUserId, 10000);
      await service.topUp(testUserId, 5000);
      await service.deduct(testUserId, 2000);
    });

    it('returns paginated results', async () => {
      const dto: GetTransactionsDto = { page: 1, limit: 10 };
      const result = await service.getTransactions(testUserId, dto);

      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('filters by type correctly', async () => {
      const dto: GetTransactionsDto = { page: 1, limit: 10, type: 'deposit' };
      const result = await service.getTransactions(testUserId, dto);

      expect(result.total).toBe(2);
      result.items.forEach((t) => expect(t.type).toBe('deposit'));
    });

    it('filters by date range correctly', async () => {
      const yesterday = new Date(Date.now() - 86_400_000).toISOString();
      const tomorrow = new Date(Date.now() + 86_400_000).toISOString();

      const inRange: GetTransactionsDto = {
        page: 1,
        limit: 10,
        startDate: yesterday,
        endDate: tomorrow,
      };
      const outOfRange: GetTransactionsDto = { page: 1, limit: 10, startDate: tomorrow };

      const inResult = await service.getTransactions(testUserId, inRange);
      const outResult = await service.getTransactions(testUserId, outOfRange);

      expect(inResult.total).toBe(3);
      expect(outResult.total).toBe(0);
    });
  });

  // ─── concurrency ─────────────────────────────────────────────────────────

  describe('concurrent topUp', () => {
    it('5 parallel topUp(100) calls result in balance = 500', async () => {
      await Promise.all([
        service.topUp(testUserId, 100),
        service.topUp(testUserId, 100),
        service.topUp(testUserId, 100),
        service.topUp(testUserId, 100),
        service.topUp(testUserId, 100),
      ]);

      const { balance } = await service.getBalance(testUserId);
      expect(balance).toBe(500);
    });
  });
});
