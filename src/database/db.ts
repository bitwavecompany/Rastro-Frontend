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
  accounts!: Table<Account, string>
  transactions!: Table<Transaction, string>
  profile!: Table<Profile, string>
  outbox!: Table<OutboxEntry, number>
  dlq!: Table<DlqEntry, number>

  constructor() {
    super('RastroLocalDB')

    // Schema v7: versión canónica sin versiones intermedias de prototipado (v3 a v6 eliminadas)
    this.version(7).stores({
      accounts: 'id, name, type, sync_status, created_at, deleted_at',
      transactions: 'id, account_id, type, payment_method, date, sync_status, created_at, deleted_at, transfer_id',
      outbox: 'opId, entity, op, createdAt, [status+createdAt]',
      profile: 'id, updated_at',
    })

    // Schema v8: Dead Letter Queue (DLQ) para operaciones rechazadas (403, 422)
    this.version(8).stores({
      dlq: '++seq, opId, entity, entityId, errorCode, failedAt',
    })
  }
}

export const db = new RastroDatabase()