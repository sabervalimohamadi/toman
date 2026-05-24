import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TopUpWalletDto {
  @ApiProperty({ example: 50000, minimum: 1000, maximum: 50000000 })
  @IsInt()
  @Min(1000)
  @Max(50000000)
  amount: number;
}
