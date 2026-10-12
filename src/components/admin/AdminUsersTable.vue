<script setup lang="ts">
import type { Profile } from '@/types/profile'

defineProps<{
  users: Profile[]
  isLoading: boolean
  formatDate: (iso?: string | null) => string
}>()

const emit = defineEmits<{
  togglePlan: [user: Profile]
  openCashModal: [user: Profile]
  viewPendingRequest: []
}>()
</script>

<template>
  <div class="space-y-4">
    <div v-if="isLoading && users.length === 0" class="py-20 text-center">
      <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-gray-500 mt-4 text-sm">Cargando clientes...</p>
    </div>

    <div v-else class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs tracking-wider">
              <th class="px-6 py-4 font-semibold">Cliente</th>
              <th class="px-6 py-4 font-semibold">Plan Actual</th>
              <th class="px-6 py-4 font-semibold">Datos de Pago / Origen</th>
              <th class="px-6 py-4 font-semibold">Registro</th>
              <th class="px-6 py-4 font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="users.length === 0">
              <td colspan="5" class="px-6 py-10 text-center text-gray-500">
                No hay clientes registrados en el sistema.
              </td>
            </tr>
            <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50/50 transition">
              <!-- Cliente -->
              <td class="px-6 py-4">
                <p class="font-bold text-gray-900">{{ user.name }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ user.email }}</p>
              </td>

              <!-- Plan -->
              <td class="px-6 py-4">
                <span 
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
                  :class="user.plan === 'premium' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-600 border border-gray-200'"
                >
                  <Icon v-if="user.plan === 'premium'" icon="lucide:crown" class="w-3 h-3" />
                  {{ user.plan }}
                </span>
              </td>

              <!-- Datos de Pago -->
              <td class="px-6 py-4">
                <div v-if="user.payment_method" class="space-y-1">
                  <p class="text-xs text-gray-700">
                    <span class="font-semibold text-gray-500">Método:</span> 
                    {{ user.payment_method === 'transfer' ? 'Transferencia' : 'Efectivo' }}
                  </p>
                  <p v-if="user.payment_bank" class="text-xs text-gray-700">
                    <span class="font-semibold text-gray-500">Banco:</span> {{ user.payment_bank }}
                  </p>
                  <p v-if="user.payment_receipt" class="text-xs text-gray-700">
                    <span class="font-semibold text-gray-500">Comprobante:</span> 
                    <span class="font-mono bg-gray-100 px-1 py-0.5 rounded">{{ user.payment_receipt }}</span>
                  </p>
                  <div v-if="user.plan === 'free' && user.payment_receipt" class="pt-1">
                    <button
                      type="button"
                      @click="emit('viewPendingRequest')"
                      class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded cursor-pointer transition shadow-xs"
                      title="Ver en la cola de solicitudes para Aprobar o Rechazar"
                    >
                      <Icon icon="lucide:clock" class="w-3 h-3 text-amber-600" />
                      Solicitud en revisión
                    </button>
                  </div>
                </div>
                <span v-else class="text-xs text-gray-400 italic">Sin datos registrados</span>
              </td>

              <!-- Fecha -->
              <td class="px-6 py-4 text-xs text-gray-500">
                {{ formatDate(user.created_at) }}
              </td>

              <!-- Acciones -->
              <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-3">
                  <!-- Toggle Switch -->
                  <div class="flex items-center gap-1.5" title="Cambiar plan manual">
                    <button 
                      @click="emit('togglePlan', user)"
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                      :class="user.plan === 'premium' ? 'bg-amber-500' : 'bg-gray-200'"
                    >
                      <span class="sr-only">Toggle Plan</span>
                      <span 
                        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm"
                        :class="user.plan === 'premium' ? 'translate-x-6' : 'translate-x-1'"
                      />
                    </button>
                    <span class="text-[11px] font-semibold text-gray-500 uppercase">{{ user.plan }}</span>
                  </div>

                  <!-- Botón Pago en Efectivo -->
                  <button
                    v-if="user.plan !== 'premium'"
                    type="button"
                    @click="emit('openCashModal', user)"
                    class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 transition cursor-pointer"
                    title="Registrar pago presencial en efectivo"
                  >
                    <Icon icon="lucide:banknote" class="w-3.5 h-3.5 text-emerald-600" />
                    Pago Efectivo
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
