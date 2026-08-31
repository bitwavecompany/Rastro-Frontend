<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import AppToastContainer from '@/components/ui/AppToastContainer.vue'
import { useProfileStore } from '@/stores/useProfileStore'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useTransactionsStore } from '@/stores/useTransactionsStore'

const route = useRoute()
const profileStore = useProfileStore()
const accountsStore = useAccountsStore()
const transactionsStore = useTransactionsStore()

const isAppReady = ref(false)

const noLayoutRoutes = ['/login', '/register', '/admin/login', '/admin/dashboard']
const useLayout = computed(() => !noLayoutRoutes.includes(route.path))

watch(() => route.path, () => {
  if (isAppReady.value && useLayout.value) {
    profileStore.silentSync()
  }
})

onMounted(async () => {
  await Promise.all([
    profileStore.load(),
    accountsStore.load(),
    transactionsStore.load()
  ])
  
  isAppReady.value = true
})
</script>

<template>
  <AppToastContainer />

  <template v-if="isAppReady">
    <AppLayout v-if="useLayout" />
    <RouterView v-else />
  </template>
  
  <div v-else class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
</template>