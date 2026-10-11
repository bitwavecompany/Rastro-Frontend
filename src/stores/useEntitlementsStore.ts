import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useSessionStore } from './useSessionStore'
import { useProfileStore } from './useProfileStore'
import { useAccountsStore } from './useAccountsStore'

export const useEntitlementsStore = defineStore('entitlements', () => {
  const session = useSessionStore()
  const profileStore = useProfileStore()
  const accountsStore = useAccountsStore()

  // PRD 2.1:
  // Guest: 1 cuenta activa (solo Efectivo auto-creada)
  // Free: 3 cuentas activas
  // Premium: Ilimitadas
  const maxAccounts = computed(() => {
    if (session.isGuest || profileStore.profile.plan === 'guest') {
      return 1
    }
    if (profileStore.profile.plan === 'free') {
      return 3
    }
    return Infinity
  })

  // Cuentas activas ocupan slots. Las desactivadas liberan su slot (PRD 3.4).
  const activeAccountsCount = computed(() => {
    return accountsStore.accounts.length
  })

  const canCreateAccount = computed(() => {
    return activeAccountsCount.value < maxAccounts.value
  })

  const hasExceededAccountLimit = computed(() => {
    return activeAccountsCount.value > maxAccounts.value
  })

  const isPremium = computed(() => profileStore.profile.plan === 'premium')
  const isFree = computed(() => session.isLoggedIn && profileStore.profile.plan === 'free')
  const isGuest = computed(() => session.isGuest || profileStore.profile.plan === 'guest')

  return {
    maxAccounts,
    activeAccountsCount,
    canCreateAccount,
    hasExceededAccountLimit,
    isPremium,
    isFree,
    isGuest
  }
})
