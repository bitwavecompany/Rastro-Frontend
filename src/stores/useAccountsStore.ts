import { defineStore } from 'pinia'
import { ref } from 'vue'
import { uuidv7 } from 'uuidv7'
import { db } from '@/database/db'
import { accountsApi } from '@/api/accounts'
import type { Account, CreateAccountPayload } from '@/types/account'

function makePlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function mapAccountFromBackend(a: any): Account {
  return {
    ...a,
    amount: Number(a.amount), 
    createdAt: a.created_at ?? a.createdAt
  }
}

function createDefaultCash(): Account {
  return {
    id: uuidv7(),
    name: 'Efectivo',
    type: 'cash',
    amount: 0,
    description: '',
    createdAt: new Date().toISOString()
  }
}

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref<Account[]>([])
  const isLoaded = ref(false)

  async function load() {
    try {
      if (localStorage.getItem('auth_token')) {
        const response = await accountsApi.getAll()
        // Mapeo aplicado aquí
        accounts.value = response.data.data.map(mapAccountFromBackend)
        await db.accounts.clear()
        if (accounts.value.length > 0) {
          await db.accounts.bulkAdd(accounts.value.map(makePlain))
        }
      } else {
        const data = await db.accounts.toArray()
        if (data.length === 0) {
          const defaultCash = createDefaultCash()
          accounts.value = [defaultCash]
          await db.accounts.add(makePlain(defaultCash))
        } else {
          accounts.value = data
        }
      }
    } catch (error) {
      const data = await db.accounts.toArray()
      if (data.length > 0) {
        accounts.value = data
      } else {
        const defaultCash = createDefaultCash()
        accounts.value = [defaultCash]
      }
    } finally {
      isLoaded.value = true
    }
  }

  async function add(payload: CreateAccountPayload): Promise<Account> {
    let account: Account
    if (localStorage.getItem('auth_token')) {
      const response = await accountsApi.create(payload)
      account = mapAccountFromBackend(response.data.data)
    } else {
      account = { id: uuidv7(), createdAt: new Date().toISOString(), ...payload }
    }
    accounts.value.push(account)
    await db.accounts.add(makePlain(account))
    return account
  }

  async function update(id: string | number, payload: Partial<CreateAccountPayload>) {
    const index = accounts.value.findIndex(a => a.id === id)
    if (index === -1) return
    if (localStorage.getItem('auth_token')) {
      await accountsApi.update(id, payload)
    }
    const updatedAccount = { ...accounts.value[index], ...payload }
    accounts.value[index] = updatedAccount
    await db.accounts.put(makePlain(updatedAccount))
  }

  async function remove(id: string | number) {
    if (localStorage.getItem('auth_token')) {
      await accountsApi.delete(id)
    }
    accounts.value = accounts.value.filter(a => a.id !== id)
    await db.accounts.delete(id)
  }

  return { accounts, isLoaded, add, update, remove, load }
})