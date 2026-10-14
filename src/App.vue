<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppToastContainer from '@/components/ui/AppToastContainer.vue'
import DowngradeAccountsModal from '@/components/modals/DowngradeAccountsModal.vue'
import SessionRevokedModal from '@/components/modals/SessionRevokedModal.vue'
import { useProfileStore } from '@/stores/useProfileStore'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import { useSessionStore } from '@/stores/useSessionStore'
import { useUserProfileQuery } from '@/composables/useUserProfileQuery'
import { useCategories } from '@/composables/useCategories'
import { syncEngine } from '@/sync/SyncEngine'

const route = useRoute()
const profileStore = useProfileStore()
const accountsStore = useAccountsStore()
const transactionsStore = useTransactionsStore()
const sessionStore = useSessionStore()
const { fetchCategories } = useCategories()

// TanStack Query gestiona el estado del perfil con staleTime: 5m y polling cada 60s
useUserProfileQuery()

const isAppReady = ref(false)

const noLayoutRoutes = ['/login', '/register', '/admin/login', '/admin/dashboard']
const useLayout = computed(() => !noLayoutRoutes.includes(route.path))

onMounted(async () => {
  await Promise.all([
    profileStore.load(),
    accountsStore.load(),
    transactionsStore.load(),
    fetchCategories(),
  ])
  
  isAppReady.value = true

  // Disparar reconciliación inicial completa con el servidor al iniciar
  syncEngine.sync(true)

  // Iniciar polling adaptativo inteligente
  syncEngine.startAutoSync()

  // Triggers de sincronización multidispositivo / móvil protegidos con cooldown
  window.addEventListener('online', () => syncEngine.triggerSmartSync(true))

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncEngine.notifyUserActivity()
      syncEngine.startAutoSync()
      syncEngine.triggerSmartSync(false)
    } else {
      syncEngine.stopAutoSync()
    }
  })

  window.addEventListener('focus', () => {
    syncEngine.notifyUserActivity()
    syncEngine.triggerSmartSync(false)
  })

  document.addEventListener('resume', () => {
    syncEngine.notifyUserActivity()
    syncEngine.triggerSmartSync(false)
  })

  // Listeners pasivos de actividad del usuario para mantener el intervalo activo (15s)
  window.addEventListener('pointerdown', () => syncEngine.notifyUserActivity(), { passive: true })
  window.addEventListener('keydown', () => syncEngine.notifyUserActivity(), { passive: true })

  // Sincronización multi-pestaña: si otra pestaña cambia de sesión o cierra sesión,
  // sincronizar el estado reactivo para prevenir peticiones con tokens cruzados
  window.addEventListener('storage', (event) => {
    if (event.key === 'auth_token' && event.newValue !== sessionStore.token) {
      window.location.reload()
    }
  })
})
</script>

<template>
  <AppToastContainer />
  <DowngradeAccountsModal />
  <SessionRevokedModal />

  <template v-if="isAppReady">
    <AppLayout v-if="useLayout" />
    <RouterView v-else />
  </template>
  
  <div v-else class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
</template>