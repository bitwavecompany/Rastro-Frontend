import api from './axios'
import type { SyncBatchRequest, SyncBatchResponse, SyncPullResponse } from '@/sync/types'

export const syncApi = {
  pushBatch: (payload: SyncBatchRequest) => api.post<SyncBatchResponse>('/sync/push', payload),
  pull: (since?: string | null) =>
    api.get<SyncPullResponse>('/sync/pull', {
      params: since ? { since } : {},
    }),
}
