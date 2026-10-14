import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { uuidv7 } from 'uuidv7'
import dayjs from 'dayjs'
import { db } from '@/database/db'
import { enqueueOutbox } from '@/sync/outbox'
import { toPlainObject } from '@/utils/clone'
import { formatDate } from '@/utils/formatters'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { compareTransactionsDesc } from '@/utils/sorting'
import type { Transaction, CreateTransactionPayload } from '@/types/transaction'
import type { TransactionType } from '@/constants/transactions'

function normalizeDate(dateStr?: string | null): string {
  if (!dateStr) return dayjs().format('YYYY-MM-DD')
  return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
}

export const useTransactionsStore = defineStore('transactions', () => {
  const _transactions = ref<Transaction[]>([])
  const isLoaded = ref(false)

  // Expose only active transactions (deleted_at == null) ordered strictly descending (newest first)
  const transactions = computed(() =>
    [..._transactions.value]
      .filter(t => !t.deleted_at)
      .sort(compareTransactionsDesc)
  )

  // All transactions (active and deactivated) ordered strictly descending
  const allTransactions = computed(() =>
    [..._transactions.value].sort(compareTransactionsDesc)
  )

  const deactivatedTransactions = computed(() =>
    [..._transactions.value]
      .filter(t => Boolean(t.deleted_at))
      .sort(compareTransactionsDesc)
  )

  const expenses = computed(() =>
    transactions.value.filter(t => t.type === 'expense')
  )

  const incomes = computed(() =>
    transactions.value.filter(t => t.type === 'income')
  )

  const allExpenses = computed(() =>
    allTransactions.value.filter(t => t.type === 'expense')
  )

  const allIncomes = computed(() =>
    allTransactions.value.filter(t => t.type === 'income')
  )

  function getTransactionById(id: string): Transaction | undefined {
    return _transactions.value.find(t => t.id === id)
  }

  async function load() {
    try {
      const data = await db.transactions.toArray()
      for (const t of data) {
        if (t.type === 'expense' && (!t.category || !t.category.trim())) {
          t.category = 'otros'
          await db.transactions.update(t.id, { category: 'otros' })
        } else if (t.type === 'income' && t.category) {
          t.category = null
          await db.transactions.update(t.id, { category: null })
        }
      }

      // Sort by date DESC -> created_at DESC -> id DESC (canonical order matching backend)
      data.sort(compareTransactionsDesc)
      _transactions.value = data
    } catch (error) {
      console.error('Error loading transactions from Dexie', error)
    } finally {
      isLoaded.value = true
    }
  }

  async function add(payload: CreateTransactionPayload): Promise<Transaction> {
    const now = new Date().toISOString()
    const type = payload.type || 'expense'
    const paymentMethod = payload.payment_method || 'cash'
    const accountId = payload.account_id
    const date = normalizeDate(payload.date)
    const isIncome = type === 'income'
    const category = isIncome
      ? null
      : (typeof payload.category === 'string' && payload.category.trim() ? payload.category.trim() : 'otros')

    // PRD Rule 6: Transaction can only be associated with an active account of the matching type
    const accountsStore = useAccountsStore()
    const targetAccount = accountsStore.accounts.find(a => a.id === accountId)
    if (!targetAccount) {
      throw new Error('Associated account is inactive or does not exist.')
    }
    const expectedType = paymentMethod === 'cash' ? 'cash' : 'bank'
    if (targetAccount.type !== expectedType) {
      throw new Error('Payment method does not match the associated account type.')
    }

    const transaction: Transaction = {
      id: uuidv7(),
      type,
      amount: Number(payload.amount),
      reason: payload.reason.trim(),
      description: payload.description?.trim() || null,
      payment_method: paymentMethod,
      account_id: accountId,
      date,
      category,
      tags: [],
      transfer_id: payload.transfer_id ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      deletion_reason: null,
      sync_status: 'pending_create',
    }

    _transactions.value.unshift(transaction)
    _transactions.value.sort(compareTransactionsDesc)
    await db.transactions.add(toPlainObject(transaction))
    await enqueueOutbox('transactions', transaction.id, 'create', toPlainObject(transaction))

    return transaction
  }

  async function update(id: string, payload: Partial<Transaction>) {
    const index = _transactions.value.findIndex(t => t.id === id)
    if (index === -1) return

    const currentTx = _transactions.value[index]
    const nextAccountId = payload.account_id || currentTx.account_id
    const nextPaymentMethod = payload.payment_method || currentTx.payment_method || 'cash'

    // PRD Rule 6: Validate active account and matching type
    const accountsStore = useAccountsStore()
    const targetAccount = accountsStore.accounts.find(a => a.id === nextAccountId)
    if (!targetAccount) {
      throw new Error('Associated account is inactive or does not exist.')
    }
    const expectedType = nextPaymentMethod === 'cash' ? 'cash' : 'bank'
    if (targetAccount.type !== expectedType) {
      throw new Error('Payment method does not match the associated account type.')
    }

    const effectiveType = payload.type || currentTx.type
    let nextCategory = currentTx.category
    if (effectiveType === 'income') {
      nextCategory = null
    } else if (payload.category !== undefined) {
      nextCategory = (typeof payload.category === 'string' && payload.category.trim()) ? payload.category.trim() : 'otros'
    } else if (!nextCategory) {
      nextCategory = 'otros'
    }

    const now = new Date().toISOString()
    const updatedTransaction: Transaction = {
      ..._transactions.value[index],
      ...payload,
      category: nextCategory,
      ...(payload.amount !== undefined && { amount: Number(payload.amount) }),
      ...(payload.date !== undefined && {
        date: normalizeDate(payload.date),
      }),
      sync_status: (_transactions.value[index].sync_status === 'pending_create' ? 'pending_create' : 'pending_update'),
      updated_at: now,
    }

    _transactions.value[index] = updatedTransaction
    _transactions.value.sort(compareTransactionsDesc)
    await db.transactions.put(toPlainObject(updatedTransaction))
    const outboxPayload = {
      ...payload,
      category: nextCategory,
    }
    await enqueueOutbox('transactions', id, 'update', toPlainObject(outboxPayload))
  }

  // PRD 6.1: Soft delete
  async function remove(id: string, reason?: string) {
    const index = _transactions.value.findIndex(t => t.id === id)
    if (index === -1) return

    const now = new Date().toISOString()
    const deletionReason = reason?.trim() || null

    const deletedTransaction: Transaction = {
      ..._transactions.value[index],
      deleted_at: now,
      deletion_reason: deletionReason,
      sync_status: 'pending_delete',
      updated_at: now,
    }

    _transactions.value[index] = deletedTransaction
    await db.transactions.put(toPlainObject(deletedTransaction))
    await enqueueOutbox('transactions', id, 'delete', { deletion_reason: deletionReason })
  }

  // PRD 6.3: Reactivate transaction
  async function restore(id: string) {
    const index = _transactions.value.findIndex(t => t.id === id)
    if (index === -1) return

    const tx = _transactions.value[index]
    const accountsStore = useAccountsStore()
    const parentAccount = accountsStore.accounts.find(a => a.id === tx.account_id)

    if (!parentAccount) {
      throw new Error('Associated account is deactivated. You must reactivate the account first.')
    }

    const now = new Date().toISOString()
    const restoredTransaction: Transaction = {
      ...tx,
      deleted_at: null,
      deletion_reason: null,
      sync_status: 'pending_update',
      updated_at: now,
    }

    _transactions.value[index] = restoredTransaction
    _transactions.value.sort(compareTransactionsDesc)
    await db.transactions.put(toPlainObject(restoredTransaction))
    await enqueueOutbox('transactions', id, 'restore')
  }

  // PRD 6.2: Permanent delete (Hard Delete) - only allowed if already deactivated
  async function hardDelete(id: string) {
    const index = _transactions.value.findIndex(t => t.id === id)
    if (index === -1) return

    const tx = _transactions.value[index]
    if (!tx.deleted_at) {
      throw new Error('A transaction must be deactivated before permanent deletion')
    }

    _transactions.value.splice(index, 1)
    await db.transactions.delete(id)
    await enqueueOutbox('transactions', id, 'hard-delete')
  }

  // PRD 6.2: Purge all transactions in an account
  async function purgeAccount(accountId: string) {
    const remaining = _transactions.value.filter(t => t.account_id !== accountId)
    _transactions.value = remaining

    const allTx = await db.transactions.toArray()
    const toDelete = allTx.filter(t => t.account_id === accountId)
    for (const tx of toDelete) {
      await db.transactions.delete(tx.id)
    }

    await enqueueOutbox('transactions', accountId, 'purge-account', { account_id: accountId })
  }

  function byAccount(accountId: string, type?: TransactionType, includeDeactivated = false): Transaction[] {
    return _transactions.value
      .filter(t => {
        const matchAccount = t.account_id === accountId
        const matchType = type ? t.type === type : true
        const matchActive = includeDeactivated ? true : !t.deleted_at
        return matchAccount && matchType && matchActive
      })
      .sort(compareTransactionsDesc)
  }

  // PRD 4.6 & Rule 7: Relocate a transaction between accounts
  async function relocate(
    id: string,
    destinationAccountId: string,
    reason: string
  ): Promise<Transaction> {
    const index = _transactions.value.findIndex(t => t.id === id)
    if (index === -1) {
      throw new Error('The transaction to relocate does not exist.')
    }

    const currentTx = _transactions.value[index]
    const isCascadeDeactivated = Boolean(currentTx.deletion_reason === 'cascade_account_deactivation')

    // Rule 16: Allow relocation of transactions deactivated by account cascade; block manual soft deletes
    if (currentTx.deleted_at && !isCascadeDeactivated) {
      throw new Error('Cannot relocate a manually deactivated transaction.')
    }

    if (currentTx.account_id === destinationAccountId) {
      throw new Error('Destination account cannot be the same as origin account.')
    }

    if (!reason?.trim()) {
      throw new Error('Relocation reason is required.')
    }

    const accountsStore = useAccountsStore()
    const destinationAccount = accountsStore.accounts.find(a => a.id === destinationAccountId)

    if (!destinationAccount) {
      throw new Error('Selected destination account is deactivated or does not exist.')
    }

    const destPaymentMethod = destinationAccount.type === 'cash' ? 'cash' : 'transfer'
    const now = new Date().toISOString()
    const newId = uuidv7()
    const destName = destinationAccount.name
    const formattedReason = `Trasladado a ${destName}: ${reason.trim()}`
    const dateFormatted = formatDate(now)

    // 1. Original record in origin account
    let deletedOriginal: Transaction
    if (isCascadeDeactivated) {
      // Rule 16: Preserve deletion_reason = cascade_account_deactivation and append note to description
      const auditNote = `[Trasladado a ${destName} el ${dateFormatted}: ${reason.trim()}]`
      const newDesc = currentTx.description
        ? `${currentTx.description}\n${auditNote}`
        : auditNote

      deletedOriginal = {
        ...currentTx,
        description: newDesc,
        sync_status: 'pending_update',
        updated_at: now,
      }
    } else {
      // Rule 7: Soft delete with formatted relocation reason
      deletedOriginal = {
        ...currentTx,
        deleted_at: now,
        deletion_reason: formattedReason,
        sync_status: 'pending_update',
        updated_at: now,
      }
    }
    _transactions.value[index] = deletedOriginal
    await db.transactions.put(toPlainObject(deletedOriginal))

    // 2. Create new transaction in destination account
    const newTransaction: Transaction = {
      id: newId,
      type: currentTx.type,
      amount: Number(currentTx.amount),
      reason: currentTx.reason,
      description: currentTx.description,
      payment_method: destPaymentMethod,
      account_id: destinationAccountId,
      date: currentTx.date, // Rule 8: preserves original transaction date
      category: currentTx.type === 'income' ? null : (currentTx.category ?? 'otros'),
      tags: [...(currentTx.tags || [])],
      transfer_id: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      deletion_reason: null,
      sync_status: 'pending_create',
    }

    _transactions.value.unshift(newTransaction)
    await db.transactions.add(toPlainObject(newTransaction))

    // 3. Enqueue relocate operation in outbox
    await enqueueOutbox('transactions', id, 'relocate', {
      id,
      new_id: newId,
      destination_account_id: destinationAccountId,
      reason: reason.trim(),
    })

    return newTransaction
  }

  // PRD 6.3, Rule 9 & Rule 16: Check if transaction originates from a relocation
  function isRelocated(tx: Transaction): boolean {
    const reasonStr = tx.deletion_reason || ''
    const descStr = tx.description || ''
    return reasonStr.startsWith('Trasladado a ') || descStr.includes('[Trasladado a ')
  }

  function getRelocationInfo(tx: Transaction): { destinationName: string; reason: string; date: string } | null {
    const reasonStr = tx.deletion_reason || ''
    const descStr = tx.description || ''

    if (reasonStr.startsWith('Trasladado a ')) {
      const match = reasonStr.match(/^Trasladado a (.*?):\s*(.*)$/)
      const destinationName = match ? match[1].trim() : 'otra cuenta'
      const userReason = match ? match[2].trim() : reasonStr
      const rawDate = tx.deleted_at || tx.updated_at || ''
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

  function getAccountBalance(accountId: string, initialBalance: number): number {
    const activeTx = byAccount(accountId, undefined, false)
    const totalIncomes = activeTx
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const totalExpenses = activeTx
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    return Number(initialBalance) + totalIncomes - totalExpenses
  }

  async function reset() {
    _transactions.value = []
    await db.transactions.clear()
    isLoaded.value = true
  }

  async function clearAll() {
    _transactions.value = []
    await db.transactions.clear()
    isLoaded.value = false
  }

  return {
    transactions,
    allTransactions,
    deactivatedTransactions,
    _rawTransactions: allTransactions,
    expenses,
    incomes,
    allExpenses,
    allIncomes,
    isLoaded,
    getTransactionById,
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
    clearAll,
    load,
  }
})