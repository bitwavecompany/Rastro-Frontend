import { computed, ref } from 'vue'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import type { Transaction, TransactionKind } from '@/types/transaction'

export type MovementTab = 'all' | 'incomes' | 'expenses'

export type Movement = Transaction & { _type: TransactionKind }

export function useAccountDetail(accountId: string | number) {
  const accountsStore = useAccountsStore()
  const transactionsStore = useTransactionsStore()

  const activeTab = ref<MovementTab>('all')

  const account = computed(() =>
    accountsStore.accounts.find(a => String(a.id) === String(accountId)) ?? null
  )

  const accountExpenses = computed(() =>
    transactionsStore.byAccount(accountId, 'expense')
  )

  const accountIncomes = computed(() =>
    transactionsStore.byAccount(accountId, 'income')
  )

  const totalExpenses = computed(() =>
    accountExpenses.value.filter(t => !t.deletedAt).reduce((sum, t) => sum + t.amount, 0)
  )

  const totalIncomes = computed(() =>
    accountIncomes.value.filter(t => !t.deletedAt).reduce((sum, t) => sum + t.amount, 0)
  )

  const balance = computed(() =>
    (account.value?.amount ?? 0) + totalIncomes.value - totalExpenses.value
  )

  const filteredMovements = computed<Movement[]>(() => {
    const inc = accountIncomes.value.map(t => ({ ...t, _type: 'income' as const }))
    const exp = accountExpenses.value.map(t => ({ ...t, _type: 'expense' as const }))
    const all = [...inc, ...exp].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    if (activeTab.value === 'incomes') return all.filter(m => m._type === 'income')
    if (activeTab.value === 'expenses') return all.filter(m => m._type === 'expense')
    return all
  })

  return {
    account,
    activeTab,
    accountExpenses,
    accountIncomes,
    totalExpenses,
    totalIncomes,
    balance,
    filteredMovements,
  }
}