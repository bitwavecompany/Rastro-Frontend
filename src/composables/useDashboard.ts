import { computed } from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import { compareTransactionsDesc } from '@/utils/sorting'

export function useDashboard() {
  const accountsStore = useAccountsStore()
  const transactionsStore = useTransactionsStore()

  // PRD 5.1: Total Patrimony = Sum of current balances across all active accounts
  const totalPatrimony = computed(() =>
    accountsStore.accounts.reduce(
      (sum, a) => sum + transactionsStore.getAccountBalance(a.id, Number(a.initial_balance ?? 0)),
      0
    )
  )

  // PRD 5.1: Incomes and Expenses of the current calendar month according to 'date'
  const currentMonthExpenses = computed(() => {
    const now = dayjs()
    return transactionsStore.expenses
      .filter(t => !t.deleted_at && dayjs(t.date || t.created_at).isSame(now, 'month'))
      .reduce((sum, t) => sum + Number(t.amount), 0)
  })

  const currentMonthIncomes = computed(() => {
    const now = dayjs()
    return transactionsStore.incomes
      .filter(t => !t.deleted_at && dayjs(t.date || t.created_at).isSame(now, 'month'))
      .reduce((sum, t) => sum + Number(t.amount), 0)
  })

  const currentMonthBalance = computed(() =>
    currentMonthIncomes.value - currentMonthExpenses.value
  )

  // PRD 5.1: Most recent 8 transactions across all accounts ordered by date descending (matching backend canonical sort)
  const recentTransactions = computed(() =>
    [...transactionsStore.transactions]
      .filter(t => !t.deleted_at)
      .sort(compareTransactionsDesc)
      .slice(0, 8)
  )

  const monthLabel = computed(() =>
    dayjs().locale('es').format('MMMM YYYY')
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