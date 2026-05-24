import { IsString, Length, Matches, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PayByCodeDto {
  @ApiProperty({ example: 'TAX7K2', minLength: 6, maxLength: 6 })
  @Transform(({ value }: { value: unknown }) => String(value).toUpperCase())
  @IsString()
  @Length(6, 6)
  @Matches(/^[A-Z0-9]{6}$/, { message: 'کد راننده باید ۶ کاراکتر حرف بزرگ یا عدد باشد' })
  driverCode: string;

  @ApiProperty({ example: 10000, minimum: 1000, maximum: 50000000 })
  @IsInt()
  @Min(1000)
  @Max(50000000)
  amount: number;
}
