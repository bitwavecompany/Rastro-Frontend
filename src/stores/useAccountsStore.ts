import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { uuidv7 } from 'uuidv7'
import { db } from '@/database/db'
import { enqueueOutbox } from '@/sync/outbox'
import { toPlainObject } from '@/utils/clone'
import { useSessionStore } from '@/stores/useSessionStore'
import type { Account, CreateAccountPayload } from '@/types/account'

function createDefaultCash(): Account {
  const now = new Date().toISOString()
  return {
    id: uuidv7(),
    name: 'Efectivo',
    type: 'cash',
    amount: 0,
    initial_balance: 0,
    description: '',
    currency: 'USD',
    is_default: true,
    createdAt: now,
    created_at: now,
    syncStatus: 'pending_create'
  }
}

export const useAccountsStore = defineStore('accounts', () => {
  const _accounts = ref<Account[]>([])
  const isLoaded = ref(false)
  const session = useSessionStore()

  // Cuentas activas (deleted_at == null) ocupan slots del plan
  const accounts = computed(() =>
    _accounts.value.filter(a => !a.deletedAt && !a.deleted_at)
  )

  // Cuentas desactivadas (soft-deleted) liberan su slot
  const deactivatedAccounts = computed(() =>
    _accounts.value.filter(a => !!(a.deletedAt || a.deleted_at))
  )

  // Cuenta inmutable y permanente por defecto
  const defaultAccountId = computed(() => {
    const def = _accounts.value.find(a => a.is_default && !a.deletedAt && !a.deleted_at)
    if (def) return def.id
    const cash = _accounts.value.find(a => a.name === 'Efectivo' && a.type === 'cash' && !a.deletedAt && !a.deleted_at)
    return cash ? cash.id : null
  })

  async function load() {
    try {
      const totalAccounts = await db.accounts.count()
      
      if (totalAccounts === 0) {
        // Inicializar cuenta inmutable por defecto "Efectivo" (PRD 3.1)
        const defaultCash = createDefaultCash()
        _accounts.value = [defaultCash]
        await db.accounts.add(toPlainObject(defaultCash))
        
        if (session.isLoggedIn) {
          await enqueueOutbox('accounts', defaultCash.id, 'create', defaultCash)
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
    const initialBal = Number(payload.amount ?? payload.initial_balance ?? 0)
    const account: Account = { 
      id: uuidv7(),
      name: payload.name.trim(),
      type: payload.type,
      amount: initialBal,
      initial_balance: initialBal,
      description: payload.description?.trim() || '',
      currency: payload.currency || 'USD',
      is_default: false,
      createdAt: now,
      created_at: now,
      syncStatus: 'pending_create',
      updatedAt: now,
      updated_at: now,
    }
    
    _accounts.value.push(account)
    await db.accounts.add(toPlainObject(account))
    await enqueueOutbox('accounts', account.id, 'create', account)
    
    return account
  }

  async function update(id: string | number, payload: Partial<CreateAccountPayload>) {
    const account = _accounts.value.find(a => String(a.id) === String(id))
    if (!account) return

    if (account.id === defaultAccountId.value || account.is_default) {
      throw new Error('La cuenta por defecto no puede ser modificada')
    }

    const index = _accounts.value.findIndex(a => String(a.id) === String(id))
    const now = new Date().toISOString()
    const updatedAccount = { 
      ..._accounts.value[index], 
      ...payload,
      ...(payload.amount !== undefined && { 
        amount: Number(payload.amount), 
        initial_balance: Number(payload.amount) 
      }),
      syncStatus: (_accounts.value[index].syncStatus === 'pending_create' ? 'pending_create' : 'pending_update') as 'pending_create' | 'pending_update',
      updatedAt: now,
      updated_at: now
    }
    
    const isTypeChanged = payload.type !== undefined && payload.type !== account.type
    if (isTypeChanged) {
      // PRD Regla 5: Cascada al cambiar el tipo de una cuenta con movimientos
      // cash → bank : todos los movimientos de la cuenta actualizan payment_method a transfer
      // bank → cash : todos los movimientos de la cuenta actualizan payment_method a cash
      const newPaymentMethod: 'transfer' | 'cash' = payload.type === 'bank' ? 'transfer' : 'cash'
      const relatedTx = await db.transactions
        .filter(t => String(t.accountId || t.account_id) === String(id))
        .toArray()

      for (const tx of relatedTx) {
        const updatedTx = {
          ...tx,
          payment_method: newPaymentMethod,
          paymentType: newPaymentMethod,
          updatedAt: now,
          updated_at: now
        }
        await db.transactions.put(toPlainObject(updatedTx))
      }

      // Actualizar transacciones en memoria
      import('@/stores/useTransactionsStore').then(({ useTransactionsStore }) => {
        const txStore = useTransactionsStore()
        txStore.load()
      })
    }

    _accounts.value[index] = updatedAccount
    await db.accounts.put(toPlainObject(updatedAccount))
    await enqueueOutbox('accounts', id, 'update', payload)
  }

  async function remove(id: string | number, deactivationReason: 'user_action' | 'plan_downgrade' = 'user_action') {
    const account = _accounts.value.find(a => String(a.id) === String(id))
    if (!account) return

    if (account.id === defaultAccountId.value || account.is_default) {
      throw new Error('La cuenta por defecto no puede ser eliminada ni desactivada')
    }

    const index = _accounts.value.findIndex(a => String(a.id) === String(id))
    const now = new Date().toISOString()

    const deletedAccount = {
      ..._accounts.value[index],
      deletedAt: now,
      deleted_at: now,
      deactivation_reason: deactivationReason,
      syncStatus: (_accounts.value[index].syncStatus === 'pending_create' ? 'pending_delete' : 'pending_delete') as 'pending_delete'
    }

    _accounts.value[index] = deletedAccount
    await db.accounts.put(toPlainObject(deletedAccount))

    // PRD 6.1 & Regla 18: Cascada al desactivar cuenta -> desactiva automáticamente todos sus movimientos con cascade_account_deactivation
    const relatedTx = await db.transactions
      .filter(t => String(t.accountId || t.account_id) === String(id) && !t.deletedAt && !t.deleted_at)
      .toArray()

    for (const tx of relatedTx) {
      const deactivatedTx = {
        ...tx,
        deletedAt: now,
        deleted_at: now,
        deleteReason: 'cascade_account_deactivation',
        deletion_reason: 'cascade_account_deactivation'
      }
      await db.transactions.put(toPlainObject(deactivatedTx))
    }

    // Actualizar transactions en memoria si el store está disponible
    import('@/stores/useTransactionsStore').then(({ useTransactionsStore }) => {
      const txStore = useTransactionsStore()
      txStore.load()
    })

    await enqueueOutbox('accounts', id, 'delete', { id, deactivation_reason: deactivationReason })
  }

  async function restore(id: string | number) {
    const index = _accounts.value.findIndex(a => String(a.id) === String(id))
    if (index === -1) return

    const now = new Date().toISOString()
    const restoredAccount = {
      ..._accounts.value[index],
      deletedAt: undefined,
      deleted_at: null,
      deactivation_reason: null,
      syncStatus: 'pending_update' as const,
      updatedAt: now,
      updated_at: now
    }

    _accounts.value[index] = restoredAccount
    await db.accounts.put(toPlainObject(restoredAccount))
    // PRD 6.1: Sin cascada al reactivar cuenta (los movimientos quedan desactivados)
    await enqueueOutbox('accounts', id, 'restore', { id })
  }

  async function hardDelete(id: string | number) {
    const account = _accounts.value.find(a => String(a.id) === String(id))
    if (!account) return

    if (account.id === defaultAccountId.value || account.is_default) {
      throw new Error('La cuenta por defecto no puede ser eliminada')
    }

    // 1. Borrar físicamente de Dexie y memoria
    _accounts.value = _accounts.value.filter(a => String(a.id) !== String(id))
    await db.accounts.delete(id)

    // 2. Borrar físicamente todos los movimientos vinculados (Regla 20)
    const relatedTx = await db.transactions
      .filter(t => String(t.accountId || t.account_id) === String(id))
      .toArray()

    for (const tx of relatedTx) {
      await db.transactions.delete(tx.id)
    }

    // Actualizar transactions en memoria
    import('@/stores/useTransactionsStore').then(({ useTransactionsStore }) => {
      const txStore = useTransactionsStore()
      txStore.load()
    })

    // 3. Encolar borrado permanente en outbox
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

  return {
    accounts,
    deactivatedAccounts,
    _rawAccounts: _accounts,
    isLoaded,
    defaultAccountId,
    add,
    update,
    remove,
    restore,
    hardDelete,
    resetToGuest,
    load
  }
})