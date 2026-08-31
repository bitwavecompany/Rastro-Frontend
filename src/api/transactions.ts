import api from './axios'
import type { CreateTransactionPayload } from '@/types/transaction'

function mapToBackend(payload: Partial<CreateTransactionPayload>) {
  const data: any = { ...payload }
  if (data.accountId !== undefined) {
    data.account_id = data.accountId
    delete data.accountId
  }
  return data
}

export const transactionsApi = {
  getAll: () => api.get('/transactions'),
  create: (payload: CreateTransactionPayload) => api.post('/transactions', mapToBackend(payload)),
  update: (id: string | number, payload: Partial<CreateTransactionPayload>) => api.patch(`/transactions/${id}`, mapToBackend(payload)),
  delete: (id: string | number, deleteReason: string) => api.delete(`/transactions/${id}`, { data: { deleteReason } })
}