import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { uuidv7 } from 'uuidv7'
import { db } from '@/database/db'
import { enqueueOutbox } from '@/sync/outbox'
import { toPlainObject } from '@/utils/clone'
import { useSessionStore } from '@/stores/useSessionStore'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import type { Account, CreateAccountPayload } from '@/types/account'

function createDefaultCash(): Account {
  const now = new Date().toISOString()
  return {
    id: uuidv7(),
    name: 'Efectivo',
    type: 'cash',
    initial_balance: 0,
    description: '',
    currency: 'USD',
    is_default: true,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_status: 'pending_create',
  }
}

export const useAccountsStore = defineStore('accounts', () => {
  const _accounts = ref<Account[]>([])
  const isLoaded = ref(false)
  const session = useSessionStore()

  // Active accounts (deleted_at == null) occupy plan capacity slots
  const accounts = computed(() =>
    _accounts.value.filter(a => !a.deleted_at)
  )

  // All accounts (active and deactivated)
  const allAccounts = computed(() => _accounts.value)

  // Deactivated accounts (soft-deleted) release their capacity slot
  const deactivatedAccounts = computed(() =>
    _accounts.value.filter(a => Boolean(a.deleted_at))
  )

  // Immutable, permanent default cash account (PRD Rule 3.1)
  const defaultAccountId = computed(() => {
    const def = _accounts.value.find(a => a.is_default && !a.deleted_at)
    if (def) return def.id
    const cash = _accounts.value.find(a => a.name === 'Efectivo' && a.type === 'cash' && !a.deleted_at)
    return cash ? cash.id : null
  })

  function getAccountById(id: string): Account | undefined {
    return _accounts.value.find(a => a.id === id)
  }

  async function load() {
    try {
      const totalAccounts = await db.accounts.count()

      if (totalAccounts === 0) {
        // Initialize immutable default "Efectivo" account (PRD 3.1)
        const defaultCash = createDefaultCash()
        _accounts.value = [defaultCash]
        await db.accounts.add(toPlainObject(defaultCash))

        if (session.isLoggedIn) {
          await enqueueOutbox('accounts', defaultCash.id, 'create', toPlainObject(defaultCash))
        }
      } else {
        const data = await db.accounts.toArray()
        _accounts.value = data
      }
    } catch (error) {
      console.error('Error loading accounts from Dexie', error)
    } finally {
      isLoaded.value = true
    }
  }

  async function add(payload: CreateAccountPayload): Promise<Account> {
    const now = new Date().toISOString()
    const initialBal = Number(payload.initial_balance ?? 0)
    const account: Account = {
      id: uuidv7(),
      name: payload.name.trim(),
      type: payload.type,
      initial_balance: initialBal,
      description: payload.description?.trim() || '',
      currency: payload.currency || 'USD',
      is_default: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      sync_status: 'pending_create',
    }

    _accounts.value.push(account)
    await db.accounts.add(toPlainObject(account))
    await enqueueOutbox('accounts', account.id, 'create', toPlainObject(account))

    return account
  }

  async function update(id: string, payload: Partial<CreateAccountPayload>) {
    const account = _accounts.value.find(a => a.id === id)
    if (!account) return

    const isDefaultAcc = account.id === defaultAccountId.value || account.is_default
    if (isDefaultAcc) {
      if (payload.type && payload.type !== 'cash') {
        throw new Error('El tipo de la cuenta por defecto no puede modificarse')
      }
      if (payload.name && payload.name.trim().toLowerCase() !== 'efectivo') {
        throw new Error('El nombre de la cuenta por defecto no puede modificarse')
      }
    }

    const index = _accounts.value.findIndex(a => a.id === id)
    const now = new Date().toISOString()
    const updatedAccount: Account = {
      ..._accounts.value[index],
      ...payload,
      ...(isDefaultAcc && {
        name: 'Efectivo',
        type: 'cash',
      }),
      ...(payload.initial_balance !== undefined && {
        initial_balance: Number(payload.initial_balance),
      }),
      sync_status: (_accounts.value[index].sync_status === 'pending_create' ? 'pending_create' : 'pending_update'),
      updated_at: now,
    }

    const isTypeChanged = payload.type !== undefined && payload.type !== account.type
    if (isTypeChanged) {
      // PRD Rule 5: Cascade when changing account type for an account with transactions
      // cash -> bank : all account transactions update payment_method to transfer
      // bank -> cash : all account transactions update payment_method to cash
      const newPaymentMethod: 'transfer' | 'cash' = payload.type === 'bank' ? 'transfer' : 'cash'
      const relatedTx = await db.transactions
        .filter(t => t.account_id === id)
        .toArray()

      for (const tx of relatedTx) {
        const updatedTx = {
          ...tx,
          payment_method: newPaymentMethod,
          updated_at: now,
        }
        await db.transactions.put(toPlainObject(updatedTx))
      }

      // Synchronously reload transactions store in memory
      const txStore = useTransactionsStore()
      await txStore.load()
    }

    _accounts.value[index] = updatedAccount
    await db.accounts.put(toPlainObject(updatedAccount))
    await enqueueOutbox('accounts', id, 'update', toPlainObject(payload))
  }

  async function remove(id: string, deactivationReason: 'user_action' | 'plan_downgrade' = 'user_action') {
    const account = _accounts.value.find(a => a.id === id)
    if (!account) return

    if (account.id === defaultAccountId.value || account.is_default) {
      throw new Error('Default account cannot be deactivated')
    }

    const index = _accounts.value.findIndex(a => a.id === id)
    const now = new Date().toISOString()

    const deletedAccount: Account = {
      ..._accounts.value[index],
      deleted_at: now,
      deactivation_reason: deactivationReason,
      sync_status: 'pending_delete',
      updated_at: now,
    }

    _accounts.value[index] = deletedAccount
    await db.accounts.put(toPlainObject(deletedAccount))

    // PRD 6.1 & Rule 18: Cascade when deactivating account -> automatically deactivates all its transactions with cascade_account_deactivation
    const relatedTx = await db.transactions
      .filter(t => t.account_id === id && !t.deleted_at)
      .toArray()

    for (const tx of relatedTx) {
      const deactivatedTx = {
        ...tx,
        deleted_at: now,
        deletion_reason: 'cascade_account_deactivation',
        updated_at: now,
      }
      await db.transactions.put(toPlainObject(deactivatedTx))
    }

    // Synchronously reload transactions in memory
    const txStore = useTransactionsStore()
    await txStore.load()

    await enqueueOutbox('accounts', id, 'delete', { id, deactivation_reason: deactivationReason })
  }

  async function restore(id: string) {
    const index = _accounts.value.findIndex(a => a.id === id)
    if (index === -1) return

    const now = new Date().toISOString()
    const restoredAccount: Account = {
      ..._accounts.value[index],
      deleted_at: null,
      deactivation_reason: null,
      sync_status: 'pending_update',
      updated_at: now,
    }

    _accounts.value[index] = restoredAccount
    await db.accounts.put(toPlainObject(restoredAccount))
    // PRD 6.1: No cascade when restoring account (transactions remain deactivated)
    await enqueueOutbox('accounts', id, 'restore', { id })
  }

  async function hardDelete(id: string) {
    const account = _accounts.value.find(a => a.id === id)
    if (!account) return

    if (account.id === defaultAccountId.value || account.is_default) {
      throw new Error('Default account cannot be deleted')
    }

    // 1. Physically delete from Dexie and memory
    _accounts.value = _accounts.value.filter(a => a.id !== id)
    await db.accounts.delete(id)

    // 2. Physically delete all linked transactions (Rule 20)
    const relatedTx = await db.transactions
      .filter(t => t.account_id === id)
      .toArray()

    for (const tx of relatedTx) {
      await db.transactions.delete(tx.id)
    }

    // Synchronously reload transactions in memory
    const txStore = useTransactionsStore()
    await txStore.load()

    // 3. Enqueue permanent deletion in outbox
    await enqueueOutbox('accounts', id, 'hard-delete', { id })
  }

  async function resetToGuest() {
    await db.accounts.clear()
    const defaultCash = createDefaultCash()
    _accounts.value = [defaultCash]
    await db.accounts.add(toPlainObject(defaultCash))
    isLoaded.value = true
    return defaultCash
  }

  async function clearAll() {
    _accounts.value = []
    await db.accounts.clear()
    isLoaded.value = false
  }

  return {
    accounts,
    allAccounts,
    deactivatedAccounts,
    _rawAccounts: allAccounts,
    isLoaded,
    defaultAccountId,
    getAccountById,
    add,
    update,
    remove,
    restore,
    hardDelete,
    resetToGuest,
    clearAll,
    load,
  }
})