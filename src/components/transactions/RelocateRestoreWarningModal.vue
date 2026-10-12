<script setup lang="ts">
import { computed } from 'vue'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import AppModal from '@/components/ui/AppModal.vue'
import type { Transaction } from '@/types/transaction'

const props = defineProps<{
  open: boolean
  transaction: Transaction | null
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  confirm: []
  cancel: []
}>()

const transactionsStore = useTransactionsStore()

const relocationInfo = computed(() => {
  if (!props.transaction) return null
  return transactionsStore.getRelocationInfo(props.transaction)
})

const warningDescription = computed(() => {
  if (!relocationInfo.value) {
    return '¿Deseas reactivar este movimiento?'
  }
  return `Este registro fue trasladado a ${relocationInfo.value.destinationName} el ${relocationInfo.value.date}. Reactivarlo lo contabilizará nuevamente en esta cuenta, duplicando el movimiento.`
})
</script>

<template>
  <AppModal
    :open="open"
    title="Reactivar registro trasladado"
    :description="warningDescription"
    confirm-label="Reactivar de todos modos"
    cancel-label="Cancelar"
    variant="warning"
    @confirm="emit('confirm')"
    @cancel="emit('cancel')"
    @update:open="emit('update:open', $event)"
  />
</template>
