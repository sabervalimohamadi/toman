import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { TopUpWalletDto } from './dto/top-up-wallet.dto';
import { GetTransactionsDto } from './dto/get-transactions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiResponse({ status: 200, description: 'Returns current wallet balance' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getBalance(@CurrentUser('id') userId: string) {
    return this.walletService.getBalance(userId);
  }

  @Post('top-up')
  @ApiOperation({ summary: 'Top up wallet balance' })
  @ApiResponse({ status: 201, description: 'Balance topped up successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  topUp(@CurrentUser('id') userId: string, @Body() dto: TopUpWalletDto) {
    return this.walletService.topUp(userId, dto.amount);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get paginated transaction history' })
  @ApiResponse({ status: 200, description: 'Returns paginated transactions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getTransactions(@CurrentUser('id') userId: string, @Query() dto: GetTransactionsDto) {
    return this.walletService.getTransactions(userId, dto);
  }
}
