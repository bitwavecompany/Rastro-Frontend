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
    
    this.version(2).stores({
      accounts: 'id, type',
      transactions: 'id, kind, accountId, createdAt',
      profile: 'id'
    }).upgrade(tx => {
      return tx.table('profile').toCollection().modify(profile => {
        if (profile.role) {
          if (profile.role === 'premium') {
            profile.roleToken = 'cHJlbWl1bV91bmxvY2tlZF8yMDI2'
          } else if (profile.role === 'registered') {
            profile.roleToken = 'cmVnaXN0ZXJlZF9sZXZlbF8yMDI2'
          } else {
            profile.roleToken = 'Z3Vlc3RfbGV2ZWxfMjAyNg=='
          }
          delete profile.role
        }
      })
    })
  }
}

export const db = new RastroDatabase()