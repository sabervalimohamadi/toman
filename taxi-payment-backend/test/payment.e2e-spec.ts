process.env['MONGOMS_SYSTEM_BINARY'] =
  'C:\\Program Files\\MongoDB\\Server\\8.3\\bin\\mongod.exe';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { AppModule } from '../src/app.module';
import { SmsService } from '../src/common/services/sms.service';
import { User, UserDocument, UserRole } from '../src/users/schemas/user.schema';

class TestSmsService extends SmsService {
  public lastCode = '';

  async send(_phone: string, message: string): Promise<void> {
    const match = message.match(/\d{6}/);
    if (match) this.lastCode = match[0];
  }
}

async function registerAndGetToken(
  app: INestApplication<App>,
  smsService: TestSmsService,
  phone: string,
): Promise<string> {
  await request(app.getHttpServer())
    .post('/api/v1/auth/send-otp')
    .send({ phone })
    .expect(200);

  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/verify-otp')
    .send({ phone, code: smsService.lastCode })
    .expect(200);

  return res.body.accessToken as string;
}

describe('Payment (e2e)', () => {
  let app: INestApplication<App>;
  let mongod: MongoMemoryReplSet;
  let userModel: Model<UserDocument>;
  const testSmsService = new TestSmsService();

  let passengerToken: string;
  let driverToken: string;
  let driverCode: string;

  const passengerPhone = '09200000001';
  const driverPhone = '09200000002';

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

    userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));

    // Register passenger
    passengerToken = await registerAndGetToken(app, testSmsService, passengerPhone);

    // Register driver (OTP creates PASSENGER by default)
    await registerAndGetToken(app, testSmsService, driverPhone);

    // Promote to DRIVER role and re-authenticate to get a token with role=driver
    await userModel.findOneAndUpdate(
      { phone: driverPhone },
      { role: UserRole.DRIVER },
    ).exec();

    driverToken = await registerAndGetToken(app, testSmsService, driverPhone);

    // Top up passenger wallet with 50 000
    await request(app.getHttpServer())
      .post('/api/v1/wallet/top-up')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ amount: 50_000 })
      .expect(201);

    // Obtain driver code
    const dcRes = await request(app.getHttpServer())
      .get('/api/v1/payment/driver-code')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(200);

    driverCode = dcRes.body.code as string;
  }, 90_000);

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  // ─── Driver endpoints ─────────────────────────────────────────────────────

  describe('POST /payment/qr/generate', () => {
    it('driver can generate a QR token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payment/qr/generate')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ expiresInSeconds: 300 })
        .expect(201);

      expect(res.body.token).toBeDefined();
      expect(res.body.driverId).toBeDefined();
      expect(res.body.expiresAt).toBeDefined();
    });

    it('passenger → POST /payment/qr/generate → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payment/qr/generate')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({})
        .expect(403);
    });

    it('unauthenticated → POST /payment/qr/generate → 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payment/qr/generate')
        .send({})
        .expect(401);
    });
  });

  describe('GET /payment/driver-code', () => {
    it('driver gets a 6-char alphanumeric code', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/payment/driver-code')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(res.body.code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('passenger → GET /payment/driver-code → 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/payment/driver-code')
        .set('Authorization', `Bearer ${passengerToken}`)
        .expect(403);
    });
  });

  // ─── QR payment flow ──────────────────────────────────────────────────────

  describe('QR payment flow', () => {
    let qrToken: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payment/qr/generate')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ expiresInSeconds: 300 })
        .expect(201);

      qrToken = res.body.token as string;
    });

    it('passenger pays by QR → 201 with payment and newBalance', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payment/pay/qr')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ qrToken, amount: 10_000 })
        .expect(201);

      expect(res.body.payment.status).toBe('success');
      expect(res.body.payment.method).toBe('qr');
      expect(res.body.newBalance).toBeDefined();
    });

    it('driver → POST /payment/pay/qr → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payment/pay/qr')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ qrToken, amount: 1_000 })
        .expect(403);
    });

    it('invalid QR token → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payment/pay/qr')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ qrToken: '00000000-0000-0000-0000-000000000000', amount: 1_000 })
        .expect(400);
    });
  });

  // ─── Manual code payment flow ─────────────────────────────────────────────

  describe('Manual code payment flow', () => {
    it('passenger pays by driver code → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payment/pay/code')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ driverCode, amount: 5_000 })
        .expect(201);

      expect(res.body.payment.status).toBe('success');
      expect(res.body.payment.method).toBe('manual_code');
    });

    it('driver → POST /payment/pay/code → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payment/pay/code')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ driverCode, amount: 1_000 })
        .expect(403);
    });

    it('wrong driver code → 404', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payment/pay/code')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ driverCode: 'XXXXXX', amount: 1_000 })
        .expect(404);
    });
  });

  // ─── Shared endpoints ─────────────────────────────────────────────────────

  describe('GET /payment/history', () => {
    it('returns paginated history for the authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/payment/history')
        .set('Authorization', `Bearer ${passengerToken}`)
        .expect(200);

      expect(res.body.items).toBeDefined();
      expect(typeof res.body.total).toBe('number');
      expect(res.body.page).toBe(1);
    });

    it('unauthenticated → GET /payment/history → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/payment/history')
        .expect(401);
    });
  });

  describe('GET /payment/:id', () => {
    let paymentId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payment/pay/code')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ driverCode, amount: 2_000 })
        .expect(201);

      paymentId = res.body.payment.id as string;
    });

    it('passenger can retrieve their own payment by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payment/${paymentId}`)
        .set('Authorization', `Bearer ${passengerToken}`)
        .expect(200);

      expect(res.body.id).toBe(paymentId);
    });

    it('driver can retrieve a payment they received', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payment/${paymentId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(res.body.id).toBe(paymentId);
    });

    it('unknown ID → 404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/payment/000000000000000000000000')
        .set('Authorization', `Bearer ${passengerToken}`)
        .expect(404);
    });
  });
});
