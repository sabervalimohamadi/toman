import { IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^09[0-9]{9}$/, {
    message: 'Phone must be a valid Iranian mobile number (e.g. 09123456789)',
  })
  phone: string;

  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'Code must be exactly 6 digits' })
  code: string;
}
