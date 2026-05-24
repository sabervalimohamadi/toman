import type { GetTransactionsDto } from '../dto/get-transactions.dto';

export interface IWallet {
  id: string;
  userId: string;
  balance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransaction {
  id: string;
  walletId: string;
  userId: string;
  type: 'deposit' | 'deduct' | 'refund';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  referenceId?: string;
  status: 'success' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface ITopUpResult {
  wallet: IWallet;
  transaction: ITransaction;
}

export interface IDeductResult {
  wallet: IWallet;
  transaction: ITransaction;
}

export interface IPaginatedTransactions {
  items: ITransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IWalletService {
  getOrCreateWallet(userId: string): Promise<IWallet>;
  getBalance(userId: string): Promise<{ balance: number; userId: string }>;
  topUp(userId: string, amount: number, referenceId?: string): Promise<ITopUpResult>;
  deduct(
    userId: string,
    amount: number,
    referenceId?: string,
    description?: string,
  ): Promise<IDeductResult>;
  refund(
    userId: string,
    amount: number,
    referenceId?: string,
    description?: string,
  ): Promise<ITopUpResult>;
  getTransactions(userId: string, dto: GetTransactionsDto): Promise<IPaginatedTransactions>;
}
