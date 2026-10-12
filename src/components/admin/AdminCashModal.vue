<script setup lang="ts">
import type { Profile } from '@/types/profile'

defineProps<{
  open: boolean
  user: Profile | null
  notes: string
  error: string
  isSubmitting: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:notes': [value: string]
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
          <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Icon icon="lucide:banknote" class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-gray-900">Registrar Pago en Efectivo</h3>
            <p class="text-xs text-gray-500">Upgrade presencial para {{ user?.name }}</p>
          </div>
        </div>

        <p class="text-xs text-gray-600">
          Al registrar el pago, el plan se actualizará a Premium inmediatamente y el sistema enviará en cola el correo de confirmación (<strong>PremiumActivatedMail</strong>) a {{ user?.email }}.
        </p>

        <div class="space-y-2">
          <label class="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Notas de Pago (Obligatorio)
          </label>
          <textarea
            :value="notes"
            @input="emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
            rows="3"
            class="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition"
            :class="error ? 'border-danger bg-danger/5' : 'border-gray-200'"
            placeholder="Ej. Pago de anualidad recibido en efectivo en oficina central..."
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
            class="px-4 py-2 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
          >
            <span v-if="isSubmitting">Procesando...</span>
            <span v-else>Confirmar y Notificar</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
