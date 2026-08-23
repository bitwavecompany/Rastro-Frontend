import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db } from '@/database/db'
import type { Transaction, CreateTransactionPayload, TransactionKind } from '@/types/transaction'

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<Transaction[]>([])
  const isLoaded = ref(false)

  const expenses = computed(() => transactions.value.filter(t => t.kind === 'expense'))
  const incomes = computed(() => transactions.value.filter(t => t.kind === 'income'))

  async function load() {
    try {
      const data = await db.transactions.orderBy('createdAt').reverse().toArray()
      transactions.value = data
    } catch (error) {
      console.error(error)
    } finally {
      isLoaded.value = true
    }
  }

  async function add(payload: CreateTransactionPayload): Promise<Transaction> {
    const transaction: Transaction = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ...payload,
    }
    transactions.value.unshift(transaction)
    await db.transactions.add(transaction)
    return transaction
  }

  async function update(id: number, payload: Partial<Transaction>) {
    const index = transactions.value.findIndex(t => t.id === id)
    if (index === -1) return
    
    const updatedTransaction = { ...transactions.value[index], ...payload }
    transactions.value[index] = updatedTransaction
    await db.transactions.put(updatedTransaction)
  }

  async function remove(id: number, reason?: string) {
    const index = transactions.value.findIndex(t => t.id === id)
    if (index === -1) return
    
    const updatedTransaction = { 
      ...transactions.value[index], 
      deletedAt: new Date().toISOString(),
      deleteReason: reason || 'Sin especificar'
    }
    transactions.value[index] = updatedTransaction
    await db.transactions.put(updatedTransaction)
  }

  function byAccount(accountId: number, kind?: TransactionKind): Transaction[] {
    return transactions.value.filter(
      t => t.accountId === accountId && (kind ? t.kind === kind : true)
    )
  }

  function getAccountBalance(accountId: number, initialAmount: number): number {
    const accountTransactions = byAccount(accountId)
    const totalIncomes = accountTransactions
      .filter(t => t.kind === 'income' && !t.deletedAt)
      .reduce((sum, t) => sum + t.amount, 0)
    const totalExpenses = accountTransactions
      .filter(t => t.kind === 'expense' && !t.deletedAt)
      .reduce((sum, t) => sum + t.amount, 0)
    
    return initialAmount + totalIncomes - totalExpenses
  }

  return { transactions, expenses, incomes, isLoaded, add, update, remove, byAccount, getAccountBalance, load }
})