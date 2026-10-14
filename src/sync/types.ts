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

export interface SyncPullAccountItem {
  id: string
  user_id?: string | null
  name: string
  type: 'cash' | 'bank'
  amount?: number
  initial_balance?: number
  description?: string | null
  currency?: string
  is_default?: boolean
  deactivation_reason?: 'user_action' | 'plan_downgrade' | null
  deleted_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface SyncPullTransactionItem {
  id: string
  account_id: string
  user_id?: string | null
  type: 'income' | 'expense'
  amount: number
  reason: string
  description?: string | null
  payment_method: 'cash' | 'transfer'
  date: string
  category?: string | null
  tags?: string[]
  transfer_id?: string | null
  deletion_reason?: string | null
  deleted_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface SyncPullData {
  server_time: string
  accounts: SyncPullAccountItem[]
  transactions: SyncPullTransactionItem[]
  deleted_account_ids?: string[]
  deleted_transaction_ids?: string[]
}

export interface SyncPullResponse {
  success: boolean
  message: string
  data: SyncPullData
  meta?: null
}
