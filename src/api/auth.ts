import api from './axios'
import type { Account } from '@/types/account'
import type { Transaction } from '@/types/transaction'
import type { Profile } from '@/types/profile'

export interface LoginPayload {
  email: string
  password: string
  device_name?: string
  force?: boolean
}

export interface RegisterSyncAccountItem {
  id: string
  name: string
  type: Account['type']
  initial_balance?: number
  amount: number
  description?: string | null
  currency: string
  is_default: boolean
}

export interface RegisterSyncTransactionItem {
  id: string
  account_id: string
  accountId: string
  type: Transaction['type']
  kind: Transaction['type']
  amount: number
  reason: string
  description?: string | null
  payment_method: Transaction['payment_method']
  paymentType: Transaction['payment_method']
  date: string
  category?: string | null
  tags: string[]
  deletion_reason?: string | null
  deleteReason?: string | null
  deleted_at?: string | null
  deletedAt?: string | null
}

export interface RegisterSyncPayload {
  name: string
  email: string
  password: string
  device_name?: string
  localData: {
    accounts: RegisterSyncAccountItem[]
    transactions: RegisterSyncTransactionItem[]
  }
}

export interface UpgradeRequestPayload {
  origin_bank: string
  transfer_receipt: string
}

export interface AuthTokensData {
  token: string
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: Profile
}

export const authApi = {
  login: (payload: LoginPayload) => api.post('/auth/login', payload),
  registerSync: (payload: RegisterSyncPayload) => api.post('/auth/register-sync', payload),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  me: () => api.get('/auth/me'),
  updateMe: (payload: { name: string }) => api.patch('/auth/me', payload),
  requestPremium: (payload: UpgradeRequestPayload) => api.post('/auth/upgrade-request', payload),
  logout: () => api.post('/auth/logout'),
  deleteAccount: () => api.delete('/auth/me'),
}