<script setup lang="ts">
defineProps<{
  totalUsers: number
  premiumUsers: number
  pendingRequests: number
}>()
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <!-- Total Clients -->
    <div class="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon icon="lucide:users" class="w-6 h-6 text-primary" />
      </div>
      <div>
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Clientes</p>
        <p class="text-2xl font-bold text-gray-900 mt-0.5">{{ totalUsers }}</p>
      </div>
    </div>

    <!-- Premium Users -->
    <div class="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
        <Icon icon="lucide:crown" class="w-6 h-6 text-amber-600" />
      </div>
      <div>
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Usuarios Premium</p>
        <p class="text-2xl font-bold text-amber-600 mt-0.5">{{ premiumUsers }}</p>
      </div>
    </div>

    <!-- Pending Requests -->
    <div class="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
        <Icon icon="lucide:clock" class="w-6 h-6 text-blue-600" />
      </div>
      <div>
        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Solicitudes Pendientes</p>
        <div class="flex items-center gap-2 mt-0.5">
          <span class="text-2xl font-bold text-gray-900">{{ pendingRequests }}</span>
          <span
            v-if="pendingRequests > 0"
            class="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700 animate-pulse"
          >
            Por revisar
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
