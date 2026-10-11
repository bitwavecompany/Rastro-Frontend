export type SyncStatus = 'synced' | 'pending_create' | 'pending_update' | 'pending_delete'

export interface SyncMetadata {
  syncStatus: SyncStatus
  updatedAt: string
  deletedAt?: string
  ownerId: string
}

export type OutboxOperation = 'create' | 'update' | 'delete' | 'restore' | 'hard-delete' | 'purge-account' | 'relocate'

export interface OutboxEntry {
  seq?: number // auto-incremented by Dexie
  opId: string // UUID for idempotency
  entity: 'accounts' | 'transactions' | 'profile'
  entityId: string | number
  op: OutboxOperation
  payload?: any
  createdAt: string
}
