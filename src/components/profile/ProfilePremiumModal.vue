<script setup lang="ts">
import { ref, watch } from 'vue'
import AppFormDialog from '@/components/ui/AppFormDialog.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    loading?: boolean
  }>(),
  { loading: false }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: { bank: string; receipt: string }]
  cancel: []
}>()

const form = ref({ bank: '', receipt: '' })
const errors = ref({ bank: '', receipt: '' })

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      form.value = { bank: '', receipt: '' }
      errors.value = { bank: '', receipt: '' }
    }
  }
)

function handleSubmit() {
  errors.value = { bank: '', receipt: '' }
  let valid = true

  if (!form.value.bank.trim()) {
    errors.value.bank = 'El banco es obligatorio'
    valid = false
  }
  if (!form.value.receipt.trim()) {
    errors.value.receipt = 'El comprobante es obligatorio'
    valid = false
  }

  if (!valid) return

  emit('submit', {
    bank: form.value.bank.trim(),
    receipt: form.value.receipt.trim(),
  })
}

function handleCancel() {
  emit('cancel')
  emit('update:open', false)
}
</script>

<template>
  <AppFormDialog
    :open="open"
    title="Mejorar a Premium"
    confirm-label="Enviar comprobante"
    cancel-label="Cancelar"
    :loading="loading"
    @confirm="handleSubmit"
    @cancel="handleCancel"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-4">
      <p class="text-sm text-gray-600">
        Realiza una transferencia bancaria e ingresa los datos a continuación. Tu solicitud será revisada manualmente.
      </p>
      <div>
        <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          Banco de origen
        </label>
        <input
          v-model="form.bank"
          type="text"
          placeholder="Ej: Banco Pichincha"
          class="w-full px-3 py-2 rounded-lg border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/100 focus:border-transparent transition"
          :class="errors.bank ? 'border-danger/60 bg-danger/10' : 'border-gray-300'"
        />
        <p v-if="errors.bank" class="mt-1 text-xs text-danger/80">{{ errors.bank }}</p>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          Número de comprobante
        </label>
        <input
          v-model="form.receipt"
          type="text"
          placeholder="Ej: TRX-10928374"
          class="w-full px-3 py-2 rounded-lg border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/100 focus:border-transparent transition"
          :class="errors.receipt ? 'border-danger/60 bg-danger/10' : 'border-gray-300'"
        />
        <p v-if="errors.receipt" class="mt-1 text-xs text-danger/80">{{ errors.receipt }}</p>
      </div>
    </div>
  </AppFormDialog>
</template>
