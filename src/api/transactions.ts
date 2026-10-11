import api from './axios'

export interface GetTransactionsParams {
  type?: 'income' | 'expense'
  kind?: 'income' | 'expense'
  account_id?: string | number
  active_only?: boolean
  page?: number
  per_page?: number
}

export const transactionsApi = {
  getAll: (params?: GetTransactionsParams) => api.get('/transactions', { params }),
  exportCsv: () => api.get('/transactions/export', { responseType: 'blob' }),
}