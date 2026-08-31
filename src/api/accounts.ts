import api from './axios'
import type { CreateAccountPayload } from '@/types/account'

export const accountsApi = {
  getAll: () => api.get('/accounts'),
  create: (payload: CreateAccountPayload) => api.post('/accounts', payload),
  update: (id: string | number, payload: Partial<CreateAccountPayload>) => api.patch(`/accounts/${id}`, payload),
  delete: (id: string | number) => api.delete(`/accounts/${id}`)
}