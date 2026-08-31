import api from './axios'

export const authApi = {
  me: () => api.get('/auth/me'),
  updateMe: (payload: { name: string }) => api.patch('/auth/me', payload),
  requestPremium: (payload: { payment_method: string, payment_bank: string, payment_receipt: string }) => api.post('/auth/upgrade-request', payload),
}