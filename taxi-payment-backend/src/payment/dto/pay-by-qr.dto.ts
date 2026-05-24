import { IsUUID, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PayByQrDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID(4)
  qrToken: string;

  @ApiProperty({ example: 10000, minimum: 1000, maximum: 50000000 })
  @IsInt()
  @Min(1000)
  @Max(50000000)
  amount: number;
}
