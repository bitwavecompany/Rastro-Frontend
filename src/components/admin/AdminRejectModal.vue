<script setup lang="ts">
import type { PremiumRequest } from '@/types/profile'

defineProps<{
  open: boolean
  request: PremiumRequest | null
  reason: string
  error: string
  isSubmitting: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:reason': [value: string]
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
            <Icon icon="lucide:alert-triangle" class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-gray-900">Rechazar Solicitud Premium</h3>
            <p class="text-xs text-gray-500">Solicitud de {{ request?.user?.name || request?.user_id }}</p>
          </div>
        </div>

        <p class="text-xs text-gray-600">
          De acuerdo con el PRD 8.3 y el contrato de API, debes ingresar un motivo claro. El sistema enviará automáticamente el correo de notificación (<strong>PremiumRejectedMail</strong>) con este motivo al cliente.
        </p>

        <div class="space-y-2">
          <label class="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Motivo de Rechazo (Obligatorio)
          </label>
          <textarea
            :value="reason"
            @input="emit('update:reason', ($event.target as HTMLTextAreaElement).value)"
            rows="3"
            class="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-danger transition"
            :class="error ? 'border-danger bg-danger/5' : 'border-gray-200'"
            placeholder="Ej. Comprobante ilegible, monto no coincide con la tarifa..."
          ></textarea>
          <p v-if="error" class="text-xs text-danger">{{ error }}</p>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="emit('cancel')"
            class="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="emit('confirm')"
            :disabled="isSubmitting"
            class="px-4 py-2 text-sm font-bold bg-danger text-white rounded-xl hover:bg-danger/90 disabled:opacity-50 cursor-pointer"
          >
            <span v-if="isSubmitting">Rechazando...</span>
            <span v-else>Rechazar Solicitud</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
