import { computed, ref } from 'vue'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import type { Transaction } from '@/types/transaction'
import type { TransactionKind } from '@/constants/transactions'

export type MovementTab = 'all' | 'incomes' | 'expenses'

export type Movement = Transaction & { _type: TransactionKind }

export function useAccountDetail(accountId: string | number) {
  const accountsStore = useAccountsStore()
  const transactionsStore = useTransactionsStore()

  const activeTab = ref<MovementTab>('all')
  // Por defecto los registros desactivados son visibles; la opción de ocultarlos es la variable
  const hideDeactivated = ref(false)

  const account = computed(() => {
    // Buscar tanto en activas como en desactivadas por si la vista se abrió
    return accountsStore._rawAccounts.find(a => String(a.id) === String(accountId)) ?? null
  })

  const deactivatedCount = computed(() =>
    transactionsStore.byAccount(accountId, undefined, true).filter(t => !!(t.deletedAt || t.deleted_at)).length
  )

  const movementsForAccount = computed(() => {
    return transactionsStore.byAccount(accountId, undefined, !hideDeactivated.value)
  })

  const accountExpenses = computed(() =>
    movementsForAccount.value.filter(t => (t.kind === 'expense' || t.type === 'expense'))
  )

  const accountIncomes = computed(() =>
    movementsForAccount.value.filter(t => (t.kind === 'income' || t.type === 'income'))
  )

  // PRD 3.3: Solo movimientos activos afectan el saldo
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
    const initial = Number(account.value?.initial_balance ?? account.value?.amount ?? 0)
    return initial + totalIncomes.value - totalExpenses.value
  })

  const filteredMovements = computed<Movement[]>(() => {
    const list = movementsForAccount.value.map(t => ({
      ...t,
      _type: (t.kind || t.type || 'expense') as TransactionKind
    }))

    const sorted = [...list].sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime()
      const dateB = new Date(b.date || b.createdAt || 0).getTime()
      return dateB - dateA
    })

    if (activeTab.value === 'incomes') return sorted.filter(m => m._type === 'income')
    if (activeTab.value === 'expenses') return sorted.filter(m => m._type === 'expense')
    return sorted
  })

  return {
    account,
    activeTab,
    hideDeactivated,
    showDeactivated: computed({
      get: () => !hideDeactivated.value,
      set: (val: boolean) => { hideDeactivated.value = !val }
    }),
    deactivatedCount,
    accountExpenses,
    accountIncomes,
    totalExpenses,
    totalIncomes,
    balance,
    filteredMovements,
    restoreMovement: transactionsStore.restore,
    relocateMovement: transactionsStore.relocate,
    hardDeleteMovement: transactionsStore.hardDelete,
    purgeAccountMovements: () => transactionsStore.purgeAccount(accountId)
  }
}