<script setup lang="ts">
import { computed } from 'vue'
import AppFormDialog from '@/components/ui/AppFormDialog.vue'
import { formatAmount, formatDate } from '@/utils/formatters'
import { useAccountsStore } from '@/stores/useAccountsStore'
import type { Transaction } from '@/types/transaction'

const props = defineProps<{
  open: boolean
  item: Transaction | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  edit: [item: Transaction]
  delete: [item: Transaction]
  relocate: [item: Transaction]
  restore: [item: Transaction]
  'hard-delete': [item: Transaction]
}>()

const accountsStore = useAccountsStore()

const accountName = computed(() => {
  if (!props.item) return 'Desconocida'
  const account = accountsStore.getAccountById(props.item.account_id)
  return account ? account.name : 'Desconocida'
})

function handleEdit() {
  if (!props.item) return
  emit('edit', props.item)
  emit('update:open', false)
}

function handleDelete() {
  if (!props.item) return
  emit('delete', props.item)
  emit('update:open', false)
}

function handleRelocate() {
  if (!props.item) return
  emit('relocate', props.item)
  emit('update:open', false)
}

function handleRestore() {
  if (!props.item) return
  emit('restore', props.item)
  emit('update:open', false)
}

function handleHardDelete() {
  if (!props.item) return
  emit('hard-delete', props.item)
  emit('update:open', false)
}
</script>

<template>
  <AppFormDialog
    :open="open"
    title="Detalle del movimiento"
    :confirm-label="item?.deleted_at ? 'Reactivar' : 'Editar'"
    :cancel-label="item?.deleted_at ? 'Cerrar' : 'Desactivar'"
    @confirm="item?.deleted_at ? handleRestore() : handleEdit()"
    @cancel="item?.deleted_at ? emit('update:open', false) : handleDelete()"
    @update:open="emit('update:open', $event)"
  >
    <div v-if="item" class="space-y-4">
      <div class="text-center pb-4 border-b border-gray-100">
        <p class="text-3xl font-bold" :class="item.type === 'income' ? 'text-income' : 'text-danger/80'">
          {{ item.type === 'income' ? '+' : '-' }}{{ formatAmount(item.amount) }}
        </p>
        <p class="text-base font-medium text-gray-800 mt-1" :class="{ 'line-through text-gray-400': item.deleted_at }">
          {{ item.reason }}
        </p>
      </div>
      
      <div class="space-y-3 text-sm">
        <div class="flex justify-between items-center">
          <span class="text-gray-500 font-medium">Estado</span>
          <span
            class="font-bold px-2 py-0.5 rounded-md text-xs uppercase tracking-wide"
            :class="item.deleted_at ? 'bg-amber-100 text-amber-700' : 'bg-income/10 text-income'"
          >
            {{ item.deleted_at ? 'Desactivado' : 'Activo' }}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500 font-medium">Fecha</span>
          <span class="font-medium text-gray-900">{{ formatDate(item.date || item.created_at || '') }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500 font-medium">Cuenta</span>
          <span class="font-medium text-gray-900">{{ accountName }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500 font-medium">Método de pago</span>
          <span class="font-medium text-gray-900">
            {{ item.payment_method === 'transfer' ? 'Transferencia' : 'Efectivo' }}
          </span>
        </div>
        <div v-if="item.deleted_at" class="flex justify-between items-center">
          <span class="text-gray-500 font-medium">Motivo desactivación</span>
          <span class="font-medium text-amber-700">{{ item.deletion_reason || 'Sin especificar' }}</span>
        </div>
      </div>

      <div v-if="item.description" class="pt-3 border-t border-gray-100">
        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Descripción</p>
        <p class="text-sm text-gray-700 bg-gray-50 border border-gray-100 p-3 rounded-xl break-words whitespace-pre-wrap leading-relaxed">
          {{ item.description }}
        </p>
      </div>

      <!-- Action buttons -->
      <div v-if="!item.deleted_at" class="pt-2">
        <button
          type="button"
          @click="handleRelocate"
          class="w-full py-2.5 px-3 rounded-xl border border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100/60 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Icon icon="lucide:arrow-right-left" class="w-4 h-4" />
          Trasladar a otra cuenta
        </button>
      </div>

      <div v-else class="pt-2">
        <button
          type="button"
          @click="handleHardDelete"
          class="w-full py-2.5 px-3 rounded-xl border border-danger/20 text-danger bg-danger/5 hover:bg-danger/10 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Icon icon="lucide:x-circle" class="w-4 h-4" />
          Eliminar permanentemente
        </button>
      </div>
    </div>
  </AppFormDialog>
</template>
