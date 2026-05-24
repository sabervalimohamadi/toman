export interface IUser {
  id: string
  phone: string
  role: 'passenger' | 'driver'
}

export interface IAuthResponse {
  accessToken: string
  user: IUser
}

export interface IWallet {
  balance: number
}

export interface ITransaction {
  id: string
  type: 'top-up' | 'payment' | 'receive'
  amount: number
  createdAt: string
  description?: string
}

export interface IPaginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface IPayment {
  id: string
  amount: number
  status: 'success' | 'failed' | 'pending'
  method: 'qr' | 'code'
  passengerPhone?: string
  driverPhone?: string
  createdAt: string
}

export interface IQRToken {
  token: string
  expiresAt: string
}

export interface IDriverCode {
  code: string
}
