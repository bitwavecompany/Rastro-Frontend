<script setup lang="ts">
import { ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'

const props = defineProps<{
  open: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
}>()

const confirmationText = ref('')
const hasError = ref(false)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      confirmationText.value = ''
      hasError.value = false
    }
  }
)

function handleConfirm() {
  if (confirmationText.value.trim().toUpperCase() !== 'ELIMINAR') {
    hasError.value = true
    return
  }
  emit('confirm')
}
</script>

<template>
  <AppModal
    :open="open"
    title="Eliminar cuenta permanentemente"
    description="Esta acción eliminará físicamente todos tus datos del dispositivo y del servidor. Para confirmar, escribe la palabra ELIMINAR a continuación:"
    confirm-label="Eliminar definitivamente"
    cancel-label="Cancelar"
    variant="danger"
    @update:open="emit('update:open', $event)"
    @confirm="handleConfirm"
  >
    <template #body>
      <div class="px-6 pb-2 space-y-3">
        <p class="text-xs text-danger font-semibold">
          ⚠️ Acción irreversible: todas tus cuentas y movimientos serán borrados sin posibilidad de recuperación.
        </p>
        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Escribe "ELIMINAR" para continuar
          </label>
          <input
            v-model="confirmationText"
            type="text"
            placeholder="ELIMINAR"
            class="w-full px-3 py-2 rounded-lg border text-sm font-mono uppercase focus:ring-2 focus:ring-danger focus:outline-none"
            :class="hasError ? 'border-danger bg-danger/5' : 'border-gray-300'"
            @input="hasError = false"
          />
          <p v-if="hasError" class="mt-1 text-xs text-danger">
            Debes escribir exactamente la palabra ELIMINAR
          </p>
        </div>
      </div>
    </template>
  </AppModal>
</template>
