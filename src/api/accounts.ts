import api from './axios'

export const accountsApi = {
  getAll: () => api.get('/accounts')
}