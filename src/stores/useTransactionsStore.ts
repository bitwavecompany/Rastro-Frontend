import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { uuidv7 } from 'uuidv7'
import dayjs from 'dayjs'
import { db } from '@/database/db'
import { enqueueOutbox } from '@/sync/outbox'
import { toPlainObject } from '@/utils/clone'
import { formatDate } from '@/utils/formatters'
import { useAccountsStore } from '@/stores/useAccountsStore'
import type { Transaction, CreateTransactionPayload } from '@/types/transaction'
import type { TransactionKind } from '@/constants/transactions'

export const useTransactionsStore = defineStore('transactions', () => {
  const _transactions = ref<Transaction[]>([])
  const isLoaded = ref(false)

  // Solo exponer transacciones activas (deleted_at == null)
  const transactions = computed(() =>
    _transactions.value.filter(t => !t.deletedAt && !t.deleted_at)
  )

  const deactivatedTransactions = computed(() =>
    _transactions.value.filter(t => !!(t.deletedAt || t.deleted_at))
  )

  const expenses = computed(() =>
    transactions.value.filter(t => (t.kind === 'expense' || t.type === 'expense'))
  )

  const incomes = computed(() =>
    transactions.value.filter(t => (t.kind === 'income' || t.type === 'income'))
  )

  const allExpenses = computed(() =>
    _transactions.value.filter(t => (t.kind === 'expense' || t.type === 'expense'))
  )

  const allIncomes = computed(() =>
    _transactions.value.filter(t => (t.kind === 'income' || t.type === 'income'))
  )

  async function load() {
    try {
      const data = await db.transactions.toArray()
      // Ordenar por date descendente (o createdAt)
      _transactions.value = data.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0).getTime()
        const dateB = new Date(b.date || b.createdAt || 0).getTime()
        return dateB - dateA
      })
    } catch (error) {
      console.error('Error loading transactions from Dexie', error)
    } finally {
      isLoaded.value = true
    }
  }

  async function add(payload: CreateTransactionPayload): Promise<Transaction> {
    const now = new Date().toISOString()
    const kind = payload.kind || payload.type || 'expense'
    const paymentType = payload.paymentType || payload.payment_method || 'cash'
    const accountId = payload.accountId || payload.account_id!
    const todayDate = dayjs().format('YYYY-MM-DD')
    const date = payload.date
      ? (payload.date.includes('T') ? payload.date.split('T')[0] : payload.date)
      : todayDate

    // PRD Regla 6: Movimiento solo puede asociarse a una cuenta activa del tipo correspondiente
    const accountsStore = useAccountsStore()
    const targetAccount = accountsStore.accounts.find(a => String(a.id) === String(accountId))
    if (!targetAccount) {
      throw new Error('La cuenta asociada se encuentra desactivada o no existe.')
    }
    const expectedType = paymentType === 'cash' ? 'cash' : 'bank'
    if (targetAccount.type !== expectedType) {
      throw new Error('El método de pago no coincide con el tipo de la cuenta asociada.')
    }

    const transaction: Transaction = {
      id: uuidv7(),
      kind,
      type: kind,
      amount: Number(payload.amount),
      reason: payload.reason.trim(),
      description: payload.description?.trim() || null,
      paymentType,
      payment_method: paymentType,
      accountId,
      account_id: accountId,
      date,
      category: null,
      tags: [],
      transfer_id: payload.transfer_id ?? null,
      createdAt: now,
      created_at: now,
      updatedAt: now,
      updated_at: now,
      syncStatus: 'pending_create'
    }

    _transactions.value.unshift(transaction)
    await db.transactions.add(toPlainObject(transaction))
    await enqueueOutbox('transactions', transaction.id, 'create', transaction)

    return transaction
  }

  async function update(id: string | number, payload: Partial<Transaction>) {
    const index = _transactions.value.findIndex(t => String(t.id) === String(id))
    if (index === -1) return

    const currentTx = _transactions.value[index]
    const nextAccountId = payload.accountId || payload.account_id || currentTx.accountId || currentTx.account_id
    const nextPaymentMethod = payload.paymentType || payload.payment_method || currentTx.paymentType || currentTx.payment_method || 'cash'

    // PRD Regla 6: Validar cuenta activa y tipo coincidente
    const accountsStore = useAccountsStore()
    const targetAccount = accountsStore.accounts.find(a => String(a.id) === String(nextAccountId))
    if (!targetAccount) {
      throw new Error('La cuenta asociada se encuentra desactivada o no existe.')
    }
    const expectedType = nextPaymentMethod === 'cash' ? 'cash' : 'bank'
    if (targetAccount.type !== expectedType) {
      throw new Error('El método de pago no coincide con el tipo de la cuenta asociada.')
    }

    const now = new Date().toISOString()
    const updatedTransaction = {
      ..._transactions.value[index],
      ...payload,
      ...(payload.amount !== undefined && { amount: Number(payload.amount) }),
      ...(payload.date !== undefined && {
        date: payload.date ? (payload.date.includes('T') ? payload.date.split('T')[0] : payload.date) : dayjs().format('YYYY-MM-DD')
      }),
      ...(payload.kind && { type: payload.kind }),
      ...(payload.type && { kind: payload.type }),
      ...(payload.paymentType && { payment_method: payload.paymentType }),
      ...(payload.payment_method && { paymentType: payload.payment_method }),
      syncStatus: (_transactions.value[index].syncStatus === 'pending_create' ? 'pending_create' : 'pending_update') as 'pending_create' | 'pending_update',
      updatedAt: now,
      updated_at: now
    }

    _transactions.value[index] = updatedTransaction
    await db.transactions.put(toPlainObject(updatedTransaction))
    await enqueueOutbox('transactions', id, 'update', payload)
  }

  // PRD 6.1: Desactivar (Soft delete)
  async function remove(id: string | number, reason?: string) {
    const index = _transactions.value.findIndex(t => String(t.id) === String(id))
    if (index === -1) return

    const now = new Date().toISOString()
    const deleteReason = reason?.trim() || null

    const deletedTransaction = {
      ..._transactions.value[index],
      deletedAt: now,
      deleted_at: now,
      deleteReason: deleteReason || undefined,
      deletion_reason: deleteReason,
      syncStatus: (_transactions.value[index].syncStatus === 'pending_create' ? 'pending_delete' : 'pending_delete') as 'pending_delete'
    }

    _transactions.value[index] = deletedTransaction
    await db.transactions.put(toPlainObject(deletedTransaction))
    await enqueueOutbox('transactions', id, 'delete', { deletion_reason: deleteReason })
  }

  // PRD 6.3: Reactivar movimiento
  async function restore(id: string | number) {
    const index = _transactions.value.findIndex(t => String(t.id) === String(id))
    if (index === -1) return

    const tx = _transactions.value[index]
    const accountsStore = useAccountsStore()
    const parentAccount = accountsStore.accounts.find(
      a => String(a.id) === String(tx.accountId || tx.account_id)
    )

    if (!parentAccount) {
      throw new Error('La cuenta seleccionada se encuentra desactivada. Debes reactivar la cuenta primero.')
    }

    const restoredTransaction = {
      ...tx,
      deletedAt: undefined,
      deleted_at: null,
      deleteReason: undefined,
      deletion_reason: null,
      syncStatus: 'pending_update' as const,
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    _transactions.value[index] = restoredTransaction
    await db.transactions.put(toPlainObject(restoredTransaction))
    await enqueueOutbox('transactions', id, 'restore')
  }

  // PRD 6.2: Eliminar permanentemente (Hard Delete) — Solo permitido si ya está desactivado
  async function hardDelete(id: string | number) {
    const index = _transactions.value.findIndex(t => String(t.id) === String(id))
    if (index === -1) return

    const tx = _transactions.value[index]
    if (!tx.deletedAt && !tx.deleted_at) {
      throw new Error('Un movimiento debe estar desactivado antes de ser eliminado permanentemente')
    }

    _transactions.value.splice(index, 1)
    await db.transactions.delete(id)
    await enqueueOutbox('transactions', id, 'hard-delete')
  }

  // PRD 6.2: Vaciar todos los movimientos de una cuenta (Purge)
  async function purgeAccount(accountId: string | number) {
    const remaining = _transactions.value.filter(
      t => String(t.accountId || t.account_id) !== String(accountId)
    )
    _transactions.value = remaining

    const allTx = await db.transactions.toArray()
    const toDelete = allTx.filter(t => String(t.accountId || t.account_id) === String(accountId))
    for (const tx of toDelete) {
      await db.transactions.delete(tx.id)
    }

    await enqueueOutbox('transactions', accountId, 'purge-account', { account_id: accountId })
  }

  function byAccount(accountId: string | number, kind?: TransactionKind, includeDeactivated = false): Transaction[] {
    return _transactions.value.filter(t => {
      const matchAccount = String(t.accountId || t.account_id) === String(accountId)
      const matchKind = kind ? (t.kind === kind || t.type === kind) : true
      const matchActive = includeDeactivated ? true : (!t.deletedAt && !t.deleted_at)
      return matchAccount && matchKind && matchActive
    })
  }

  // PRD 4.6 & Regla 7: Traslado de un registro entre cuentas
  async function relocate(
    id: string | number,
    destinationAccountId: string | number,
    reason: string
  ): Promise<Transaction> {
    const index = _transactions.value.findIndex(t => String(t.id) === String(id))
    if (index === -1) {
      throw new Error('El movimiento que intentas trasladar no existe.')
    }

    const currentTx = _transactions.value[index]
    const isCascadeDeactivated = Boolean(
      currentTx.deletion_reason === 'cascade_account_deactivation' ||
      currentTx.deleteReason === 'cascade_account_deactivation'
    )

    // Regla 16: Permitir traslado de registros desactivados por cascada de cuenta; bloquear si fue desactivado manualmente
    if ((currentTx.deletedAt || currentTx.deleted_at) && !isCascadeDeactivated) {
      throw new Error('No se puede trasladar un movimiento desactivado.')
    }

    const currentAccId = currentTx.accountId || currentTx.account_id
    if (String(currentAccId) === String(destinationAccountId)) {
      throw new Error('La cuenta destino no puede ser la misma cuenta de origen.')
    }

    if (!reason?.trim()) {
      throw new Error('El motivo del traslado es obligatorio.')
    }

    const accountsStore = useAccountsStore()
    const destinationAccount = accountsStore.accounts.find(
      a => String(a.id) === String(destinationAccountId)
    )

    if (!destinationAccount) {
      throw new Error('La cuenta destino seleccionada se encuentra desactivada o no existe.')
    }

    const destPaymentMethod = destinationAccount.type === 'cash' ? 'cash' : 'transfer'
    const now = new Date().toISOString()
    const newId = uuidv7()
    const destName = destinationAccount.name
    const formattedReason = `Trasladado a ${destName}: ${reason.trim()}`
    const dateFormatted = formatDate(now)

    // 1. Registro original en la cuenta origen
    let deletedOriginal: Transaction
    if (isCascadeDeactivated) {
      // Regla 16: Conserva deletion_reason = cascade_account_deactivation y anexa nota en description
      const auditNote = `[Trasladado a ${destName} el ${dateFormatted}: ${reason.trim()}]`
      const newDesc = currentTx.description
        ? `${currentTx.description}\n${auditNote}`
        : auditNote

      deletedOriginal = {
        ...currentTx,
        description: newDesc,
        syncStatus: 'pending_update',
        updatedAt: now,
        updated_at: now
      }
    } else {
      // Regla 7: Soft delete con motivo de traslado
      deletedOriginal = {
        ...currentTx,
        deletedAt: now,
        deleted_at: now,
        deleteReason: formattedReason,
        deletion_reason: formattedReason,
        syncStatus: 'pending_update',
        updatedAt: now,
        updated_at: now
      }
    }
    _transactions.value[index] = deletedOriginal
    await db.transactions.put(toPlainObject(deletedOriginal))

    // 2. Crear nuevo registro en la cuenta destino heredando campos del original
    const newTransaction: Transaction = {
      id: newId,
      kind: currentTx.kind,
      type: currentTx.type || currentTx.kind,
      amount: Number(currentTx.amount),
      reason: currentTx.reason,
      description: currentTx.description,
      paymentType: destPaymentMethod,
      payment_method: destPaymentMethod,
      accountId: destinationAccountId,
      account_id: destinationAccountId,
      date: currentTx.date, // Regla 8: conserva la fecha real original del movimiento
      category: currentTx.category ?? null,
      tags: [...(currentTx.tags || [])],
      transfer_id: null,
      createdAt: now,
      created_at: now,
      updatedAt: now,
      updated_at: now,
      syncStatus: 'pending_create'
    }

    _transactions.value.unshift(newTransaction)
    await db.transactions.add(toPlainObject(newTransaction))

    // 3. Encolar operación de traslado en outbox
    await enqueueOutbox('transactions', id, 'relocate', {
      id,
      new_id: newId,
      destination_account_id: destinationAccountId,
      reason: reason.trim()
    })

    return newTransaction
  }

  // PRD 6.3, Regla 9 & Regla 16: Verificación de si un movimiento proviene de un traslado
  function isRelocated(tx: Transaction): boolean {
    const reasonStr = tx.deletion_reason || tx.deleteReason || ''
    const descStr = tx.description || ''
    return reasonStr.startsWith('Trasladado a ') || descStr.includes('[Trasladado a ')
  }

  function getRelocationInfo(tx: Transaction): { destinationName: string; reason: string; date: string } | null {
    const reasonStr = tx.deletion_reason || tx.deleteReason || ''
    const descStr = tx.description || ''

    if (reasonStr.startsWith('Trasladado a ')) {
      const match = reasonStr.match(/^Trasladado a (.*?):\s*(.*)$/)
      const destinationName = match ? match[1].trim() : 'otra cuenta'
      const userReason = match ? match[2].trim() : reasonStr
      const rawDate = tx.deleted_at || tx.deletedAt || tx.updated_at || tx.updatedAt || ''
      const date = formatDate(rawDate)
      return { destinationName, reason: userReason, date }
    }

    if (descStr.includes('[Trasladado a ')) {
      const match = descStr.match(/\[Trasladado a (.*?) el (.*?):\s*(.*?)\]/)
      if (match) {
        return { destinationName: match[1].trim(), date: match[2].trim(), reason: match[3].trim() }
      }
    }

    return null
  }

  function getAccountBalance(accountId: string | number, initialAmount: number): number {
    const activeTx = byAccount(accountId, undefined, false)
    const totalIncomes = activeTx
      .filter(t => t.kind === 'income' || t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const totalExpenses = activeTx
      .filter(t => t.kind === 'expense' || t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    return Number(initialAmount) + totalIncomes - totalExpenses
  }

  async function reset() {
    _transactions.value = []
    await db.transactions.clear()
    isLoaded.value = true
  }

  return {
    transactions,
    deactivatedTransactions,
    _rawTransactions: _transactions,
    expenses,
    incomes,
    allExpenses,
    allIncomes,
    isLoaded,
    add,
    update,
    remove,
    restore,
    hardDelete,
    purgeAccount,
    relocate,
    isRelocated,
    getRelocationInfo,
    byAccount,
    getAccountBalance,
    reset,
    load
  }
})