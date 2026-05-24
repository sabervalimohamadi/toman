import { IsOptional, IsEnum, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetTransactionsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Transform(({ value }: { value: unknown }) =>
    value !== undefined ? parseInt(String(value), 10) : 1,
  )
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Transform(({ value }: { value: unknown }) =>
    value !== undefined ? parseInt(String(value), 10) : 10,
  )
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({ enum: ['deposit', 'deduct', 'refund'] })
  @IsOptional()
  @IsEnum(['deposit', 'deduct', 'refund'])
  type?: 'deposit' | 'deduct' | 'refund';

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
