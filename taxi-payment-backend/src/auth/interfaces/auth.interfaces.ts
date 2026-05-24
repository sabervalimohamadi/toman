import { UserRole } from '../../users/schemas/user.schema';

export interface IJwtPayload {
  sub: string;
  phone: string;
  role: UserRole;
}

export interface IUserInfo {
  id: string;
  phone: string;
  name: string | undefined;
  role: UserRole;
}

export interface IAuthResponse {
  accessToken: string;
  user: IUserInfo;
}

export interface ISendOtpResponse {
  message: string;
  expiresIn: number;
}
