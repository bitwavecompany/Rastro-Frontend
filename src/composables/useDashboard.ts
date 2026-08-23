import { computed } from 'vue'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import dayjs from 'dayjs'

export function useDashboard() {
  const accountsStore = useAccountsStore()
  const transactionsStore = useTransactionsStore()

  const totalPatrimony = computed(() =>
    accountsStore.accounts.reduce((sum, a) => sum + transactionsStore.getAccountBalance(a.id, a.amount), 0)
  )

  const currentMonthExpenses = computed(() => {
    const now = dayjs()
    return transactionsStore.expenses
      .filter(t => !t.deletedAt && dayjs(t.createdAt).isSame(now, 'month'))
      .reduce((sum, t) => sum + t.amount, 0)
  })

  const currentMonthIncomes = computed(() => {
    const now = dayjs()
    return transactionsStore.incomes
      .filter(t => !t.deletedAt && dayjs(t.createdAt).isSame(now, 'month'))
      .reduce((sum, t) => sum + t.amount, 0)
  })

  const currentMonthBalance = computed(() =>
    currentMonthIncomes.value - currentMonthExpenses.value
  )

  const recentTransactions = computed(() =>
    [...transactionsStore.transactions]
      .filter(t => !t.deletedAt)
      .slice(0, 8)
  )

  const monthLabel = computed(() =>
    dayjs().format('MMMM YYYY')
  )

  return {
    accounts: accountsStore.accounts,
    totalPatrimony,
    currentMonthExpenses,
    currentMonthIncomes,
    currentMonthBalance,
    recentTransactions,
    monthLabel,
    getAccountBalance: transactionsStore.getAccountBalance,
  }
}