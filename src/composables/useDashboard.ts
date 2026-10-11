import { computed } from 'vue'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import dayjs from 'dayjs'

export function useDashboard() {
  const accountsStore = useAccountsStore()
  const transactionsStore = useTransactionsStore()

  // PRD 5.1: Patrimonio Total = Suma de saldos actuales de todas las cuentas activas
  const totalPatrimony = computed(() =>
    accountsStore.accounts.reduce(
      (sum, a) => sum + transactionsStore.getAccountBalance(a.id, Number(a.initial_balance ?? a.amount ?? 0)),
      0
    )
  )

  // PRD 5.1: Ingresos y Gastos del mes calendario actual según el campo 'date'
  const currentMonthExpenses = computed(() => {
    const now = dayjs()
    return transactionsStore.expenses
      .filter(t => !t.deletedAt && !t.deleted_at && dayjs(t.date || t.createdAt).isSame(now, 'month'))
      .reduce((sum, t) => sum + Number(t.amount), 0)
  })

  const currentMonthIncomes = computed(() => {
    const now = dayjs()
    return transactionsStore.incomes
      .filter(t => !t.deletedAt && !t.deleted_at && dayjs(t.date || t.createdAt).isSame(now, 'month'))
      .reduce((sum, t) => sum + Number(t.amount), 0)
  })

  const currentMonthBalance = computed(() =>
    currentMonthIncomes.value - currentMonthExpenses.value
  )

  // PRD 5.1: Los últimos 8 movimientos de todas las cuentas ordenados por date descendente
  const recentTransactions = computed(() =>
    [...transactionsStore.transactions]
      .filter(t => !t.deletedAt && !t.deleted_at)
      .sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime())
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