import api from './axios'

export const syncApi = {
  pushBatch: (payload: any) => api.post('/sync/push', payload)
}
