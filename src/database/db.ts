import Dexie, { type Table } from 'dexie'
import type { Account } from '@/types/account'
import type { Transaction } from '@/types/transaction'
import type { Profile } from '@/types/profile'
import type { OutboxEntry } from '@/sync/types'

export interface DlqEntry extends OutboxEntry {
  errorCode: number
  errorMessage: string
  failedAt: string
}

export class RastroDatabase extends Dexie {
  accounts!: Table<Account, string | number>
  transactions!: Table<Transaction, string | number>
  profile!: Table<Profile, string>
  outbox!: Table<OutboxEntry, number>
  meta!: Table<{ key: string; value: any }, string>
  dlq!: Table<DlqEntry, number>

  constructor() {
    super('RastroLocalDB')
    
    // v3 Schema: Added sync fields and outbox/meta tables
    this.version(3).stores({
      accounts: 'id, type, syncStatus, updatedAt, deletedAt, ownerId',
      transactions: 'id, kind, accountId, createdAt, syncStatus, updatedAt, deletedAt, ownerId',
      profile: 'id',
      outbox: '++seq, opId, entity, entityId, createdAt',
      meta: 'key'
    })

    // v4 Schema: Added Dead Letter Queue (DLQ)
    this.version(4).stores({
      dlq: '++seq, opId, entity, entityId, failedAt'
    })

    // v5 Schema: Canonical fields (is_default, date, deleted_at, account_id)
    this.version(5).stores({
      accounts: 'id, type, is_default, syncStatus, updatedAt, deletedAt, deleted_at, ownerId',
      transactions: 'id, kind, type, accountId, account_id, date, createdAt, syncStatus, updatedAt, deletedAt, deleted_at, ownerId',
      dlq: '++seq, opId, entity, entityId, errorCode, failedAt'
    })

    // v6 Schema: Added transfer_id (Backlog transferencias entre cuentas propias)
    this.version(6).stores({
      transactions: 'id, kind, type, accountId, account_id, date, transfer_id, createdAt, syncStatus, updatedAt, deletedAt, deleted_at, ownerId'
    })
  }
}

export const db = new RastroDatabase()