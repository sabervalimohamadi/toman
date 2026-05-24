import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { randomInt } from 'crypto';
import { Otp, OtpDocument } from './schemas/otp.schema';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { SmsService } from '../common/services/sms.service';
import {
  IAuthResponse,
  IJwtPayload,
  ISendOtpResponse,
} from './interfaces/auth.interfaces';

const OTP_TTL_SECONDS = 120;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Otp.name) private readonly otpModel: Model<OtpDocument>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly smsService: SmsService,
  ) {}

  async sendOtp(phone: string): Promise<ISendOtpResponse> {
    const existingUser = await this.usersService.findByPhone(phone);
    if (existingUser && !existingUser.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    await this.otpModel.deleteMany({ phone, isUsed: false });

    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    await this.otpModel.create({ phone, code, expiresAt });
    await this.smsService.send(phone, `Your verification code is: ${code}`);

    return { message: 'OTP sent successfully', expiresIn: OTP_TTL_SECONDS };
  }

  async verifyOtp(phone: string, code: string): Promise<IAuthResponse> {
    const otp = await this.otpModel
      .findOne({ phone, code, isUsed: false, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .exec();

    if (!otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    otp.isUsed = true;
    await otp.save();

    const existingUser = await this.usersService.findByPhone(phone);
    const user: UserDocument = existingUser ?? (await this.usersService.create(phone));

    const finalUser: UserDocument = user.isVerified
      ? user
      : await this.usersService.update(user.id as string, { isVerified: true });

    const payload: IJwtPayload = {
      sub: finalUser.id as string,
      phone: finalUser.phone,
      role: finalUser.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: finalUser.id as string,
        phone: finalUser.phone,
        name: finalUser.name,
        role: finalUser.role,
      },
    };
  }

  async getProfile(userId: string): Promise<UserDocument> {
    return this.usersService.findById(userId);
  }
}
