import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import { AppModule } from '../src/app.module';
import { Otp, OtpDocument } from '../src/auth/schemas/otp.schema';

/**
 * Full auth flow e2e tests.
 * All tests share a single MongoMemoryServer instance — no per-test DB cleanup
 * so the OTP created in an earlier step is still valid for a later step.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let otpModel: Model<OtpDocument>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    // Setting MONGODB_URI before module creation causes ConfigModule to pick
    // this value over the .env file (dotenv skips keys already in process.env)
    process.env['MONGODB_URI'] = mongod.getUri();
    process.env['JWT_SECRET'] = 'e2e-test-secret';
    process.env['JWT_EXPIRES_IN'] = '1d';

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    otpModel = moduleRef.get<Model<OtpDocument>>(getModelToken(Otp.name));
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  // ─── POST /auth/send-otp ─────────────────────────────────────────────────

  describe('POST /api/v1/auth/send-otp', () => {
    it('returns 200 with message and expiresIn', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ phone: '09100000001' });

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body).toMatchObject({
        message: expect.any(String),
        expiresIn: 120,
      });
    });

    it('returns 400 for an invalid Iranian phone number', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ phone: '12345' });

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('returns 400 when phone is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({});

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  // ─── Full flow: send → wrong code → correct code → profile ──────────────

  describe('Full authentication flow', () => {
    const phone = '09111111111';
    let validCode: string;
    let accessToken: string;

    beforeAll(async () => {
      // Send OTP once; subsequent tests reuse the same unexpired code
      await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ phone });

      const otp = await otpModel.findOne({ phone, isUsed: false });
      validCode = otp!.code;
    });

    it('POST /api/v1/auth/verify-otp (wrong code) → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({ phone, code: '000000' });

      expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('POST /api/v1/auth/verify-otp (correct code) → 200 + token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({ phone, code: validCode });

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body).toMatchObject({
        accessToken: expect.any(String),
        user: {
          phone,
          id: expect.any(String),
          role: expect.any(String),
        },
      });

      accessToken = res.body.accessToken as string;
    });

    it('GET /api/v1/auth/profile (with token) → 200 + user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.phone).toBe(phone);
    });

    it('GET /api/v1/auth/profile (no token) → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/profile');

      expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('GET /api/v1/auth/profile (malformed token) → 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer this.is.not.a.valid.token');

      expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });
});
