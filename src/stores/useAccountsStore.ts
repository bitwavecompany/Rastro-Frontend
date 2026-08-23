import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '@/database/db'
import type { Account, CreateAccountPayload } from '@/types/account'

const DEFAULT_CASH: Account = {
  id: 1,
  name: 'Efectivo',
  type: 'cash',
  amount: 0,
  description: '',
  createdAt: new Date().toISOString(),
}

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref<Account[]>([])
  const isLoaded = ref(false)

  async function load() {
    try {
      const data = await db.accounts.toArray()
      if (data.length === 0) {
        accounts.value = [DEFAULT_CASH]
        await db.accounts.add(DEFAULT_CASH)
      } else {
        accounts.value = data
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
      accounts.value = [DEFAULT_CASH]
    } finally {
      isLoaded.value = true
    }
  }

  async function add(payload: CreateAccountPayload): Promise<Account> {
    const account: Account = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ...payload,
    }
    accounts.value.push(account)
    await db.accounts.add(account)
    return account
  }

  async function update(id: number, payload: Partial<CreateAccountPayload>) {
    const index = accounts.value.findIndex(a => a.id === id)
    if (index === -1) return
    
    const updatedAccount = { ...accounts.value[index], ...payload }
    accounts.value[index] = updatedAccount
    await db.accounts.put(updatedAccount)
  }

  async function remove(id: number) {
    accounts.value = accounts.value.filter(a => a.id !== id)
    await db.accounts.delete(id)
  }

  return { accounts, isLoaded, add, update, remove, load }
})