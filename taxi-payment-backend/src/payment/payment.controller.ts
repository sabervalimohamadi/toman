import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { PayByQrDto } from './dto/pay-by-qr.dto';
import { PayByCodeDto } from './dto/pay-by-code.dto';
import { GenerateQrDto } from './dto/generate-qr.dto';
import { GetPaymentsDto } from './dto/get-payments.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/schemas/user.schema';

@ApiTags('payment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ─── Driver endpoints ────────────────────────────────────────────────────

  @Post('qr/generate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Generate a QR token (driver only)' })
  @ApiResponse({ status: 201, description: 'QR token generated' })
  @ApiResponse({ status: 403, description: 'Driver role required' })
  generateQR(
    @CurrentUser('id') driverId: string,
    @Body() dto: GenerateQrDto,
  ) {
    return this.paymentService.generateQRToken(driverId, dto);
  }

  @Get('driver-code')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Get or create permanent driver code (driver only)' })
  @ApiResponse({ status: 200, description: 'Driver code returned' })
  @ApiResponse({ status: 403, description: 'Driver role required' })
  getDriverCode(@CurrentUser('id') driverId: string) {
    return this.paymentService.getOrCreateDriverCode(driverId);
  }

  // ─── Passenger endpoints ─────────────────────────────────────────────────

  @Post('pay/qr')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PASSENGER)
  @ApiOperation({ summary: 'Pay by scanning a QR token (passenger only)' })
  @ApiResponse({ status: 201, description: 'Payment successful' })
  @ApiResponse({ status: 400, description: 'Invalid/expired token or insufficient balance' })
  @ApiResponse({ status: 403, description: 'Passenger role required' })
  payByQR(@CurrentUser('id') passengerId: string, @Body() dto: PayByQrDto) {
    return this.paymentService.payByQR(passengerId, dto);
  }

  @Post('pay/code')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PASSENGER)
  @ApiOperation({ summary: 'Pay by driver code (passenger only)' })
  @ApiResponse({ status: 201, description: 'Payment successful' })
  @ApiResponse({ status: 400, description: 'Insufficient balance' })
  @ApiResponse({ status: 403, description: 'Passenger role required' })
  @ApiResponse({ status: 404, description: 'Driver code not found' })
  payByCode(@CurrentUser('id') passengerId: string, @Body() dto: PayByCodeDto) {
    return this.paymentService.payByCode(passengerId, dto);
  }

  // ─── Shared endpoints ─────────────────────────────────────────────────────

  @Get('history')
  @ApiOperation({ summary: 'Get paginated payment history for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Paginated payment list' })
  getHistory(@CurrentUser('id') userId: string, @Query() dto: GetPaymentsDto) {
    return this.paymentService.getPaymentHistory(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment found' })
  @ApiResponse({ status: 404, description: 'Payment not found or unauthorized' })
  getById(@CurrentUser('id') userId: string, @Param('id') paymentId: string) {
    return this.paymentService.getPaymentById(userId, paymentId);
  }
}
