import { computed, ref } from 'vue'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import type { Transaction } from '@/types/transaction'

export type MovementTab = 'all' | 'incomes' | 'expenses'
export type Movement = Transaction

export function useAccountDetail(accountId: string) {
  const accountsStore = useAccountsStore()
  const transactionsStore = useTransactionsStore()

  const activeTab = ref<MovementTab>('all')
  const hideDeactivated = ref(false)

  const account = computed(() => {
    return accountsStore.getAccountById(accountId) ?? null
  })

  const deactivatedCount = computed(() =>
    transactionsStore.byAccount(accountId, undefined, true).filter(t => !!t.deleted_at).length
  )

  const movementsForAccount = computed(() => {
    return transactionsStore.byAccount(accountId, undefined, !hideDeactivated.value)
  })

  // PRD 3.3: Only active transactions affect account balance
  const activeExpenses = computed(() =>
    transactionsStore.byAccount(accountId, 'expense', false)
  )

  const activeIncomes = computed(() =>
    transactionsStore.byAccount(accountId, 'income', false)
  )

  const totalExpenses = computed(() =>
    activeExpenses.value.reduce((sum, t) => sum + Number(t.amount), 0)
  )

  const totalIncomes = computed(() =>
    activeIncomes.value.reduce((sum, t) => sum + Number(t.amount), 0)
  )

  const balance = computed(() => {
    const initial = Number(account.value?.initial_balance ?? 0)
    return initial + totalIncomes.value - totalExpenses.value
  })

  const filteredMovements = computed<Movement[]>(() => {
    const sorted = [...movementsForAccount.value].sort((a, b) => {
      const dateA = new Date(a.date || a.created_at || 0).getTime()
      const dateB = new Date(b.date || b.created_at || 0).getTime()
      return dateB - dateA
    })

    if (activeTab.value === 'incomes') return sorted.filter(m => m.type === 'income')
    if (activeTab.value === 'expenses') return sorted.filter(m => m.type === 'expense')
    return sorted
  })

  return {
    account,
    activeTab,
    hideDeactivated,
    deactivatedCount,
    totalExpenses,
    totalIncomes,
    balance,
    filteredMovements,
    restoreMovement: transactionsStore.restore,
    relocateMovement: transactionsStore.relocate,
    hardDeleteMovement: transactionsStore.hardDelete,
    purgeAccountMovements: () => transactionsStore.purgeAccount(accountId),
  }
}