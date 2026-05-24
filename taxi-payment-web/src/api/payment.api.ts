import client from './client'
import type { IQRToken, IDriverCode, IPaginated, IPayment } from '../types'

export function generateQR(expiresInSeconds?: number): Promise<IQRToken> {
  return client.post<IQRToken>('/payment/qr/generate', { expiresInSeconds }).then((r) => r.data)
}

export function getDriverCode(): Promise<IDriverCode> {
  return client.get<IDriverCode>('/payment/driver-code').then((r) => r.data)
}

export function payByQR(qrToken: string, amount: number): Promise<{ message: string }> {
  return client.post<{ message: string }>('/payment/pay/qr', { qrToken, amount }).then((r) => r.data)
}

export function payByCode(driverCode: string, amount: number): Promise<{ message: string }> {
  return client
    .post<{ message: string }>('/payment/pay/code', { driverCode, amount })
    .then((r) => r.data)
}

export function getPaymentHistory(
  page: number,
  limit: number,
  status?: string,
): Promise<IPaginated<IPayment>> {
  return client
    .get<IPaginated<IPayment>>('/payment/history', { params: { page, limit, status } })
    .then((r) => r.data)
}
