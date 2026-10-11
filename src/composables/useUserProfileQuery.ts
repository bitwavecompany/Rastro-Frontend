import { computed, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { authApi } from '@/api/auth'
import { useSessionStore } from '@/stores/useSessionStore'
import { useProfileStore } from '@/stores/useProfileStore'
import { db } from '@/database/db'
import { toPlainObject } from '@/utils/clone'

export function useUserProfileQuery() {
  const sessionStore = useSessionStore()
  const profileStore = useProfileStore()

  const isEnabled = computed(() => sessionStore.isLoggedIn && !sessionStore.isRevokedRemotely)

  const query = useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const { data } = await authApi.me()
      return data.data
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutos: dato fresco sin requests innecesarios
    refetchInterval: 60 * 1000, // 60 segundos: polling periódico en primer plano
    refetchOnWindowFocus: true, // refresca al volver a la app
    refetchIntervalInBackground: false, // sin polling en background
    retry: 1,
  })

  // Sincronizar datos reactivamente con profileStore y Dexie cuando la query se resuelve
  watch(
    () => query.data.value,
    async (user) => {
      if (!user) return

      if (profileStore.profile.plan === 'free' && user.plan === 'premium') {
        profileStore.justUpgraded = true
      }

      const updated = {
        id: String(user.id),
        name: user.name || user.alias || profileStore.profile.name,
        alias: user.alias || user.name || profileStore.profile.alias,
        email: user.email || profileStore.profile.email,
        plan: (user.plan || 'free') as 'guest' | 'free' | 'premium',
        role: (user.role || 'client') as 'client' | 'admin',
        payment_method: user.payment_method ?? profileStore.profile.payment_method,
        payment_bank: user.payment_bank ?? profileStore.profile.payment_bank,
        payment_receipt: user.payment_receipt ?? profileStore.profile.payment_receipt,
        created_at: user.created_at || profileStore.profile.created_at,
        updated_at: user.updated_at || profileStore.profile.updated_at,
      }

      await profileStore.setProfileLocally(updated)
      await db.profile.put(toPlainObject(profileStore.profile))
    },
    { immediate: true }
  )

  return query
}
