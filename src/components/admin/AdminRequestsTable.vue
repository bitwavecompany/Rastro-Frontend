<script setup lang="ts">
import type { PremiumRequest } from '@/types/profile'

defineProps<{
  requests: PremiumRequest[]
  isLoading: boolean
  formatDate: (iso?: string | null) => string
  timeAgo: (iso?: string | null) => string
}>()

const emit = defineEmits<{
  approve: [req: PremiumRequest]
  reject: [req: PremiumRequest]
}>()
</script>

<template>
  <div class="space-y-4">
    <div v-if="isLoading && requests.length === 0" class="py-20 text-center">
      <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-gray-500 mt-4 text-sm">Cargando solicitudes...</p>
    </div>

    <div v-else class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs tracking-wider">
              <th class="px-6 py-4 font-semibold">Cliente</th>
              <th class="px-6 py-4 font-semibold">Banco Origen</th>
              <th class="px-6 py-4 font-semibold">Nro. Comprobante</th>
              <th class="px-6 py-4 font-semibold">Fecha y Tiempo Transcurrido</th>
              <th class="px-6 py-4 font-semibold">Estado</th>
              <th class="px-6 py-4 font-semibold text-center">Decisión Admin</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="requests.length === 0">
              <td colspan="6" class="px-6 py-10 text-center text-gray-500">
                No hay solicitudes en la cola.
              </td>
            </tr>
            <tr v-for="req in requests" :key="req.id" class="hover:bg-gray-50/50 transition">
              <!-- Cliente -->
              <td class="px-6 py-4">
                <p class="font-bold text-gray-900">{{ req.user?.name || `Usuario ID: ${req.user_id}` }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ req.user?.email || '—' }}</p>
              </td>

              <!-- Banco -->
              <td class="px-6 py-4 font-medium text-gray-800">
                {{ req.origin_bank || '—' }}
              </td>

              <!-- Comprobante -->
              <td class="px-6 py-4">
                <span class="font-mono bg-gray-100 px-2 py-1 rounded text-xs text-gray-800 font-semibold border border-gray-200">
                  {{ req.transfer_receipt || '—' }}
                </span>
              </td>

              <!-- Fecha y Tiempo -->
              <td class="px-6 py-4 text-xs text-gray-500">
                <p class="font-medium text-gray-700">{{ formatDate(req.created_at) }}</p>
                <p class="text-gray-400 mt-0.5">Hace {{ timeAgo(req.created_at) }}</p>
              </td>

              <!-- Estado -->
              <td class="px-6 py-4">
                <span
                  class="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"
                  :class="{
                    'bg-amber-100 text-amber-800': req.status === 'pending_verification',
                    'bg-emerald-100 text-emerald-800': req.status === 'approved',
                    'bg-rose-100 text-rose-800': req.status === 'rejected',
                  }"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :class="{
                      'bg-amber-500': req.status === 'pending_verification',
                      'bg-emerald-500': req.status === 'approved',
                      'bg-rose-500': req.status === 'rejected',
                    }"
                  ></span>
                  {{ req.status === 'pending_verification' ? 'Pendiente' : (req.status === 'approved' ? 'Aprobada' : 'Rechazada') }}
                </span>
                <p v-if="req.rejection_reason" class="text-[11px] text-rose-600 mt-1 max-w-xs truncate" :title="req.rejection_reason">
                  Motivo: {{ req.rejection_reason }}
                </p>
              </td>

              <!-- Acciones -->
              <td class="px-6 py-4">
                <div v-if="req.status === 'pending_verification'" class="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    @click="emit('approve', req)"
                    class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition flex items-center gap-1 cursor-pointer"
                  >
                    <Icon icon="lucide:check" class="w-3.5 h-3.5" />
                    Aprobar
                  </button>
                  <button
                    type="button"
                    @click="emit('reject', req)"
                    class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Icon icon="lucide:x" class="w-3.5 h-3.5" />
                    Rechazar
                  </button>
                </div>
                <div v-else class="text-center text-xs text-gray-400 italic">
                  Procesada
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
