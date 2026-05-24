import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Otp } from './schemas/otp.schema';
import { UserRole } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { SmsService } from '../common/services/sms.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PHONE = '09123456789';
const CODE = '123456';
const USER_ID = '507f1f77bcf86cd799439011';

/** Returns a query chain with .sort().exec() – used for otpModel.findOne */
const sortedQuery = (result: unknown) => ({
  sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(result) }),
});

const makeOtp = (overrides: Partial<Record<string, unknown>> = {}) => ({
  phone: PHONE,
  code: CODE,
  isUsed: false,
  expiresAt: new Date(Date.now() + 120_000),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: USER_ID,
  phone: PHONE,
  name: undefined as string | undefined,
  role: UserRole.PASSENGER,
  isVerified: false,
  isActive: true,
  ...overrides,
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let otpModel: Record<string, jest.Mock>;
  let usersService: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;
  let smsService: Record<string, jest.Mock>;

  beforeEach(async () => {
    otpModel = {
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      create: jest.fn().mockResolvedValue(makeOtp()),
      findOne: jest.fn().mockReturnValue(sortedQuery(null)),
      findByIdAndUpdate: jest.fn(),
    };

    usersService = {
      findByPhone: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      create: jest.fn().mockResolvedValue(makeUser()),
      update: jest.fn().mockResolvedValue(makeUser({ isVerified: true })),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('signed-test-token'),
    };

    smsService = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(Otp.name), useValue: otpModel },
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: SmsService, useValue: smsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── sendOtp ─────────────────────────────────────────────────────────────

  describe('sendOtp', () => {
    it('saves OTP to DB and calls sms.send()', async () => {
      const result = await service.sendOtp(PHONE);

      expect(result.message).toBeDefined();
      expect(result.expiresIn).toBe(120);

      expect(otpModel['create']).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: PHONE,
          code: expect.stringMatching(/^\d{6}$/),
        }),
      );
      expect(smsService['send']).toHaveBeenCalledWith(PHONE, expect.any(String));
    });

    it('deletes previous unused OTP before creating a new one', async () => {
      await service.sendOtp(PHONE);

      expect(otpModel['deleteMany']).toHaveBeenCalledWith({
        phone: PHONE,
        isUsed: false,
      });
      // deleteMany must be called before create
      const deleteManyOrder = otpModel['deleteMany'].mock.invocationCallOrder[0];
      const createOrder = otpModel['create'].mock.invocationCallOrder[0];
      expect(deleteManyOrder).toBeLessThan(createOrder);
    });

    it('includes expiresAt in the OTP query with a future date', async () => {
      const before = new Date();
      await service.sendOtp(PHONE);

      const [createdOtp] = (otpModel['create'] as jest.Mock).mock.calls[0] as [
        { expiresAt: Date },
      ];
      expect(createdOtp.expiresAt.getTime()).toBeGreaterThan(before.getTime());
    });

    it('throws UnauthorizedException when the account is deactivated', async () => {
      usersService['findByPhone'].mockResolvedValue(makeUser({ isActive: false }));

      await expect(service.sendOtp(PHONE)).rejects.toThrow(UnauthorizedException);
      expect(otpModel['create']).not.toHaveBeenCalled();
    });
  });

  // ─── verifyOtp ───────────────────────────────────────────────────────────

  describe('verifyOtp', () => {
    it('throws UnauthorizedException when code is wrong (findOne returns null)', async () => {
      otpModel['findOne'].mockReturnValue(sortedQuery(null));

      await expect(service.verifyOtp(PHONE, '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when OTP is expired (findOne returns null)', async () => {
      // The service query includes expiresAt: { $gt: now }, so expired OTPs
      // are not returned by findOne – we simulate this by returning null.
      otpModel['findOne'].mockReturnValue(sortedQuery(null));

      await expect(service.verifyOtp(PHONE, CODE)).rejects.toThrow(
        UnauthorizedException,
      );

      // Verify the query included the expiry filter
      expect(otpModel['findOne']).toHaveBeenCalledWith(
        expect.objectContaining({ expiresAt: { $gt: expect.any(Date) } }),
      );
    });

    it('returns accessToken and user info on success', async () => {
      const otp = makeOtp({ code: CODE });
      otpModel['findOne'].mockReturnValue(sortedQuery(otp));
      usersService['findByPhone'].mockResolvedValue(makeUser({ isVerified: true }));

      const result = await service.verifyOtp(PHONE, CODE);

      expect(result.accessToken).toBe('signed-test-token');
      expect(result.user.phone).toBe(PHONE);
      expect(result.user.id).toBe(USER_ID);
    });

    it('marks the OTP as used after successful verification', async () => {
      const otp = makeOtp({ code: CODE });
      otpModel['findOne'].mockReturnValue(sortedQuery(otp));
      usersService['findByPhone'].mockResolvedValue(makeUser({ isVerified: true }));

      await service.verifyOtp(PHONE, CODE);

      expect(otp.isUsed).toBe(true);
      expect(otp.save).toHaveBeenCalled();
    });

    it('creates a new user when none exists', async () => {
      const otp = makeOtp({ code: CODE });
      otpModel['findOne'].mockReturnValue(sortedQuery(otp));
      usersService['findByPhone'].mockResolvedValue(null); // no existing user

      const result = await service.verifyOtp(PHONE, CODE);

      expect(usersService['create']).toHaveBeenCalledWith(PHONE);
      expect(result.user.phone).toBe(PHONE);
    });

    it('marks the user as verified on first successful login', async () => {
      const otp = makeOtp({ code: CODE });
      otpModel['findOne'].mockReturnValue(sortedQuery(otp));
      // User exists but is not yet verified
      usersService['findByPhone'].mockResolvedValue(makeUser({ isVerified: false }));

      await service.verifyOtp(PHONE, CODE);

      expect(usersService['update']).toHaveBeenCalledWith(
        USER_ID,
        { isVerified: true },
      );
    });

    it('skips update when user is already verified', async () => {
      const otp = makeOtp({ code: CODE });
      otpModel['findOne'].mockReturnValue(sortedQuery(otp));
      usersService['findByPhone'].mockResolvedValue(makeUser({ isVerified: true }));

      await service.verifyOtp(PHONE, CODE);

      expect(usersService['update']).not.toHaveBeenCalled();
    });

    it('signs JWT with correct payload', async () => {
      const otp = makeOtp({ code: CODE });
      otpModel['findOne'].mockReturnValue(sortedQuery(otp));
      usersService['findByPhone'].mockResolvedValue(makeUser({ isVerified: true }));

      await service.verifyOtp(PHONE, CODE);

      expect(jwtService['sign']).toHaveBeenCalledWith({
        sub: USER_ID,
        phone: PHONE,
        role: UserRole.PASSENGER,
      });
    });
  });
});
