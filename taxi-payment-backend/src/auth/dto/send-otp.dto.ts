import { IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @Matches(/^09[0-9]{9}$/, {
    message: 'Phone must be a valid Iranian mobile number (e.g. 09123456789)',
  })
  phone: string;
}
