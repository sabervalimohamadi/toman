import type { GetPaymentsDto } from '../dto/get-payments.dto';

export interface IPayment {
  id: string;
  passengerId: string;
  driverId: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  method: 'qr' | 'manual_code';
  qrToken?: string;
  driverCode?: string;
  failureReason?: string;
  paidAt?: Date;
  refundedAt?: Date;
  walletTransactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDriverCode {
  id: string;
  driverId: string;
  code: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQRToken {
  token: string;
  driverId: string;
  expiresAt: Date;
}

export interface IQRPaymentResult {
  payment: IPayment;
  newBalance: number;
}

export interface IManualPaymentResult {
  payment: IPayment;
  newBalance: number;
}

export interface IPaginatedPayments {
  items: IPayment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IPaymentService {
  generateQRToken(driverId: string, dto: { expiresInSeconds?: number }): Promise<IQRToken>;
  getOrCreateDriverCode(driverId: string): Promise<IDriverCode>;
  payByQR(passengerId: string, dto: { qrToken: string; amount: number }): Promise<IQRPaymentResult>;
  payByCode(
    passengerId: string,
    dto: { driverCode: string; amount: number },
  ): Promise<IManualPaymentResult>;
  getPaymentHistory(userId: string, dto: GetPaymentsDto): Promise<IPaginatedPayments>;
  getPaymentById(userId: string, paymentId: string): Promise<IPayment>;
}
