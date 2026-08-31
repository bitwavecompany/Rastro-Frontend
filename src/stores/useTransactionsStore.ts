import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { uuidv7 } from 'uuidv7'
import { db } from '@/database/db'
import { transactionsApi } from '@/api/transactions'
import type { Transaction, CreateTransactionPayload, TransactionKind } from '@/types/transaction'

function makePlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function mapFromBackend(t: any): Transaction {
  return {
    ...t,
    amount: Number(t.amount), // <- Conversión a número
    accountId: t.account_id ?? t.accountId,
    createdAt: t.created_at ?? t.createdAt,
    deletedAt: t.deleted_at ?? t.deletedAt,
  }
}

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<Transaction[]>([])
  const isLoaded = ref(false)

  const expenses = computed(() => transactions.value.filter(t => t.kind === 'expense'))
  const incomes = computed(() => transactions.value.filter(t => t.kind === 'income'))

  async function load() {
    try {
      if (localStorage.getItem('auth_token')) {
        const response = await transactionsApi.getAll()
        transactions.value = response.data.data.map(mapFromBackend)
        
        await db.transactions.clear()
        if (transactions.value.length > 0) {
          await db.transactions.bulkAdd(transactions.value.map(makePlain))
        }
      } else {
        transactions.value = await db.transactions.orderBy('createdAt').reverse().toArray()
      }
    } catch (error) {
      transactions.value = await db.transactions.orderBy('createdAt').reverse().toArray()
    } finally {
      isLoaded.value = true
    }
  }

  async function add(payload: CreateTransactionPayload): Promise<Transaction> {
    let transaction: Transaction
    if (localStorage.getItem('auth_token')) {
      const response = await transactionsApi.create(payload)
      transaction = mapFromBackend(response.data.data)
    } else {
      transaction = { id: uuidv7(), createdAt: new Date().toISOString(), ...payload }
    }
    transactions.value.unshift(transaction)
    await db.transactions.add(makePlain(transaction))
    return transaction
  }

  async function update(id: string | number, payload: Partial<Transaction>) {
    const index = transactions.value.findIndex(t => t.id === id)
    if (index === -1) return
    if (localStorage.getItem('auth_token')) {
      await transactionsApi.update(id, payload)
    }
    const updatedTransaction = { ...transactions.value[index], ...payload }
    transactions.value[index] = updatedTransaction
    await db.transactions.put(makePlain(updatedTransaction))
  }

  async function remove(id: string | number, reason?: string) {
    const index = transactions.value.findIndex(t => t.id === id)
    if (index === -1) return
    const deleteReason = reason || 'Sin especificar'
    if (localStorage.getItem('auth_token')) {
      await transactionsApi.delete(id, deleteReason)
    }
    const updatedTransaction = {
      ...transactions.value[index],
      deletedAt: new Date().toISOString(),
      deleteReason
    }
    transactions.value[index] = updatedTransaction
    await db.transactions.put(makePlain(updatedTransaction))
  }

  function byAccount(accountId: string | number, kind?: TransactionKind): Transaction[] {
    return transactions.value.filter(
      t => String(t.accountId) === String(accountId) && (kind ? t.kind === kind : true)
    )
  }

  function getAccountBalance(accountId: string | number, initialAmount: number): number {
    const accountTransactions = byAccount(accountId)
    const totalIncomes = accountTransactions
      .filter(t => t.kind === 'income' && !t.deletedAt)
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const totalExpenses = accountTransactions
      .filter(t => t.kind === 'expense' && !t.deletedAt)
      .reduce((sum, t) => sum + Number(t.amount), 0)
    return Number(initialAmount) + totalIncomes - totalExpenses
  }

  return { transactions, expenses, incomes, isLoaded, add, update, remove, byAccount, getAccountBalance, load }
})