import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateQrDto {
  @ApiPropertyOptional({ default: 300, minimum: 60, maximum: 3600 })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  expiresInSeconds?: number = 300;
}
