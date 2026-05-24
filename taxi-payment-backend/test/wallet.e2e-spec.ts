import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { AppModule } from '../src/app.module';
import { SmsService } from '../src/common/services/sms.service';

// Use the system-installed MongoDB binary to skip the ~600 MB download.
process.env['MONGOMS_SYSTEM_BINARY'] =
  'C:\\Program Files\\MongoDB\\Server\\8.3\\bin\\mongod.exe';

class TestSmsService extends SmsService {
  public lastCode = '';

  async send(_phone: string, message: string): Promise<void> {
    const match = message.match(/\d{6}/);
    if (match) this.lastCode = match[0];
  }
}

describe('Wallet (e2e)', () => {
  let app: INestApplication<App>;
  let mongod: MongoMemoryReplSet;
  let token: string;
  const testSmsService = new TestSmsService();

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env['MONGODB_URI'] = mongod.getUri();
    process.env['JWT_SECRET'] = 'e2e-test-secret';
    process.env['JWT_EXPIRES_IN'] = '1h';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SmsService)
      .useValue(testSmsService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Full auth flow to obtain JWT
    await request(app.getHttpServer())
      .post('/api/v1/auth/send-otp')
      .send({ phone: '09123456789' })
      .expect(200);

    const verifyRes = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '09123456789', code: testSmsService.lastCode })
      .expect(200);

    token = verifyRes.body.accessToken as string;
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  // ─── GET /wallet/balance ────────────────────────────────────────────────

  it('GET /wallet/balance → 200 with balance: 0', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/wallet/balance')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.balance).toBe(0);
    expect(res.body.userId).toBeDefined();
  });

  it('GET /wallet/balance (no token) → 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/wallet/balance').expect(401);
  });

  // ─── POST /wallet/top-up ────────────────────────────────────────────────

  it('POST /wallet/top-up (amount: 10000) → 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/wallet/top-up')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 10000 })
      .expect(201);

    expect(res.body.wallet.balance).toBe(10000);
    expect(res.body.transaction.type).toBe('deposit');
    expect(res.body.transaction.amount).toBe(10000);
  });

  it('GET /wallet/balance → 200 with balance: 10000 after top-up', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/wallet/balance')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.balance).toBe(10000);
  });

  it('POST /wallet/top-up (amount: 0) → 400 validation error', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/wallet/top-up')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 0 })
      .expect(400);
  });

  // ─── GET /wallet/transactions ───────────────────────────────────────────

  it('GET /wallet/transactions → 200 with 1 item and page info', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/wallet/transactions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.total).toBe(1);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
    expect(res.body.totalPages).toBe(1);
  });

  it('GET /wallet/transactions?type=deposit → 1 result', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/wallet/transactions?type=deposit')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.total).toBe(1);
    expect(res.body.items[0].type).toBe('deposit');
  });

  it('GET /wallet/transactions?type=deduct → 0 results', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/wallet/transactions?type=deduct')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.total).toBe(0);
    expect(res.body.items).toHaveLength(0);
  });
});
