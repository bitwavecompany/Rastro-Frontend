import Dexie, { type Table } from 'dexie'
import type { Account } from '@/types/account'
import type { Transaction } from '@/types/transaction'
import type { Profile } from '@/types/profile'

export class RastroDatabase extends Dexie {
  accounts!: Table<Account, number>
  transactions!: Table<Transaction, number>
  profile!: Table<Profile, string>

  constructor() {
    super('RastroLocalDB')
    this.version(1).stores({
      accounts: 'id, type',
      transactions: 'id, kind, accountId, createdAt',
      profile: 'id'
    })
  }
}

export const db = new RastroDatabase()