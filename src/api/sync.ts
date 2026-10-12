import api from './axios'
import type { SyncBatchRequest, SyncBatchResponse } from '@/sync/types'

export const syncApi = {
  pushBatch: (payload: SyncBatchRequest) => api.post<SyncBatchResponse>('/sync/push', payload),
}
