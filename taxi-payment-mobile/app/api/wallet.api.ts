import client from './client'
import type { IWallet, IPaginated, ITransaction } from '../types'

export function getBalance(): Promise<IWallet> {
  return client.get<IWallet>('/wallet/balance').then((r) => r.data)
}

export function topUp(amount: number): Promise<{ message: string }> {
  return client.post<{ message: string }>('/wallet/top-up', { amount }).then((r) => r.data)
}

export function getTransactions(page: number, limit: number, type?: string): Promise<IPaginated<ITransaction>> {
  return client.get<IPaginated<ITransaction>>('/wallet/transactions', { params: { page, limit, type } }).then((r) => r.data)
}
