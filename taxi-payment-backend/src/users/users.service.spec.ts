import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './schemas/user.schema';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_ID = '507f1f77bcf86cd799439011';
const PHONE = '09123456789';

/** Wraps a value so it looks like a Mongoose query with .exec() */
const q = (result: unknown) => ({ exec: jest.fn().mockResolvedValue(result) });

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;

  const mockUser = {
    id: VALID_ID,
    _id: VALID_ID,
    phone: PHONE,
    role: UserRole.PASSENGER,
    isVerified: false,
    isActive: true,
    name: undefined as string | undefined,
  };

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findByPhone ─────────────────────────────────────────────────────────

  describe('findByPhone', () => {
    it('returns null for an unknown phone', async () => {
      mockUserModel.findOne.mockReturnValue(q(null));

      const result = await service.findByPhone('09000000000');

      expect(result).toBeNull();
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ phone: '09000000000' });
    });

    it('returns the user when phone is found', async () => {
      mockUserModel.findOne.mockReturnValue(q(mockUser));

      const result = await service.findByPhone(PHONE);

      expect(result).toEqual(mockUser);
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a user with PASSENGER role by default', async () => {
      mockUserModel.create.mockResolvedValue(mockUser);

      const result = await service.create(PHONE);

      expect(mockUserModel.create).toHaveBeenCalledWith({
        phone: PHONE,
        role: UserRole.PASSENGER,
      });
      expect(result.role).toBe(UserRole.PASSENGER);
      expect(result.isVerified).toBe(false);
      expect(result.isActive).toBe(true);
    });

    it('creates a user with a specified role', async () => {
      const driverUser = { ...mockUser, role: UserRole.DRIVER };
      mockUserModel.create.mockResolvedValue(driverUser);

      const result = await service.create(PHONE, UserRole.DRIVER);

      expect(mockUserModel.create).toHaveBeenCalledWith({
        phone: PHONE,
        role: UserRole.DRIVER,
      });
      expect(result.role).toBe(UserRole.DRIVER);
    });
  });

  // ─── findById ────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns the correct user for a valid ObjectId', async () => {
      mockUserModel.findById.mockReturnValue(q(mockUser));

      const result = await service.findById(VALID_ID);

      expect(result).toEqual(mockUser);
      expect(mockUserModel.findById).toHaveBeenCalledWith(VALID_ID);
    });

    it('throws NotFoundException when user is not in DB', async () => {
      mockUserModel.findById.mockReturnValue(q(null));

      await expect(service.findById(VALID_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException and skips DB for an invalid id format', async () => {
      await expect(service.findById('not-an-object-id')).rejects.toThrow(NotFoundException);
      expect(mockUserModel.findById).not.toHaveBeenCalled();
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates only the provided fields and returns the updated document', async () => {
      const updatedUser = { ...mockUser, name: 'Ali' };
      mockUserModel.findByIdAndUpdate.mockReturnValue(q(updatedUser));

      const result = await service.update(VALID_ID, { name: 'Ali' });

      expect(result.name).toBe('Ali');
      expect(result.phone).toBe(PHONE);
      expect(result.role).toBe(UserRole.PASSENGER);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        VALID_ID,
        { $set: { name: 'Ali' } },
        { new: true },
      );
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue(q(null));

      await expect(service.update(VALID_ID, { name: 'Ghost' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException and skips DB for an invalid id format', async () => {
      await expect(service.update('bad-id', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUserModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });
});
