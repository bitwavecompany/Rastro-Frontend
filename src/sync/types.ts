export type SyncStatus = 'synced' | 'pending_create' | 'pending_update' | 'pending_delete'

export type OutboxOperation =
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'hard-delete'
  | 'purge-account'
  | 'relocate'

export interface OutboxEntry {
  seq?: number
  opId: string
  entity: 'accounts' | 'transactions' | 'profile'
  entityId: string
  op: OutboxOperation
  payload?: Record<string, unknown>
  createdAt: string
}

export interface SyncBatchOperation {
  opId: string
  entity: OutboxEntry['entity']
  op: OutboxOperation
  payload: Record<string, unknown>
}

export interface SyncBatchRequest {
  operations: SyncBatchOperation[]
}

export interface SyncOperationResult {
  opId: string
  status: 'success' | 'error'
  code?: number
  message?: string
}

export interface SyncBatchResponse {
  success?: boolean
  message?: string
  data?: {
    results: SyncOperationResult[]
  }
  results?: SyncOperationResult[]
}
