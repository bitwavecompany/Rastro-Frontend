import api from './axios'

export interface LoginPayload {
  email: string
  password: string
  device_name?: string
  force?: boolean
}

export interface RegisterSyncPayload {
  name: string
  email: string
  password: string
  device_name?: string
  localData: {
    accounts: any[]
    transactions: any[]
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
  user: any
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