import client from './client'
import type { IAuthResponse } from '../types'

export function sendOtp(phone: string): Promise<{ message: string }> {
  return client.post<{ message: string }>('/auth/send-otp', { phone }).then((r) => r.data)
}

export function verifyOtp(phone: string, code: string): Promise<IAuthResponse> {
  return client.post<IAuthResponse>('/auth/verify-otp', { phone, code }).then((r) => r.data)
}
