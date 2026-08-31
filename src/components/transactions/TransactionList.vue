<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Transaction, TransactionKind } from '@/types/transaction'
import MovementRow from '@/components/transactions/MovementRow.vue'
import AppFormDialog from '@/components/ui/AppFormDialog.vue'
import { formatAmount, formatDate, paymentLabel } from '@/utils/formatters'
import { useAccountsStore } from '@/stores/useAccountsStore'

const props = defineProps<{
  kind: TransactionKind
  items: Transaction[]
}>()

const emit = defineEmits<{
  edit: [item: Transaction]
  delete: [item: Transaction]
}>()

const accountsStore = useAccountsStore()

const title = computed(() =>
  props.kind === 'expense' ? 'Historial de gastos' : 'Historial de ingresos'
)

const emptyLabel = computed(() =>
  props.kind === 'expense' ? 'Sin gastos registrados' : 'Sin ingresos registrados'
)

const emptyHint = computed(() =>
  props.kind === 'expense'
    ? 'Agrega tu primer gasto usando el formulario.'
    : 'Agrega tu primer ingreso usando el formulario.'
)

const editHoverClass = computed(() =>
  props.kind === 'expense'
    ? 'hover:text-primary hover:bg-primary/10'
    : 'hover:text-income hover:bg-income/10'
)

const selectedItem = ref<Transaction | null>(null)
const isDetailOpen = ref(false)

function openDetails(item: Transaction) {
  selectedItem.value = item
  isDetailOpen.value = true
}

function handleEditFromDetail() {
  if (selectedItem.value) {
    emit('edit', selectedItem.value)
    isDetailOpen.value = false
  }
}

function handleDeleteFromDetail() {
  if (selectedItem.value) {
    emit('delete', selectedItem.value)
    isDetailOpen.value = false
  }
}

function getAccountName(accountId: string | number) {
  const account = accountsStore.accounts.find(a => String(a.id) === String(accountId))
  return account ? account.name : 'Desconocida'
}
</script>

<template>
  <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
    <div class="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <h2 class="text-base font-semibold text-gray-900">{{ title }}</h2>
      <span class="text-xs text-gray-400 font-medium">
        {{ items.length }} registro{{ items.length !== 1 ? 's' : '' }}
      </span>
    </div>

    <div v-if="items.length === 0" class="py-14 text-center">
      <Icon icon="lucide:inbox" class="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p class="text-sm font-medium text-gray-500">{{ emptyLabel }}</p>
      <p class="text-xs text-gray-400 mt-1">{{ emptyHint }}</p>
    </div>

    <template v-else>
      <div class="divide-y divide-gray-50 md:hidden">
        <MovementRow
          v-for="item in items"
          :key="item.id"
          :item="item"
          :edit-hover-class="editHoverClass"
          :show-account="true"
          @select="openDetails"
          @edit="emit('edit', $event)"
          @delete="emit('delete', $event)"
        />
      </div>

      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12"></th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Razón</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cuenta</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Fecha</th>
              <th class="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Monto</th>
              <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <MovementRow
              v-for="item in items"
              :key="item.id"
              :item="item"
              :edit-hover-class="editHoverClass"
              :show-account="true"
              @select="openDetails"
              @edit="emit('edit', $event)"
              @delete="emit('delete', $event)"
            />
          </tbody>
        </table>
      </div>
    </template>
  </div>

  <AppFormDialog
    v-model:open="isDetailOpen"
    title="Detalle del movimiento"
    :confirm-label="selectedItem?.deletedAt ? 'Aceptar' : 'Editar'"
    :cancel-label="selectedItem?.deletedAt ? 'Cerrar' : 'Eliminar'"
    @confirm="selectedItem?.deletedAt ? (isDetailOpen = false) : handleEditFromDetail()"
    @cancel="selectedItem?.deletedAt ? (isDetailOpen = false) : handleDeleteFromDetail()"
  >
    <div v-if="selectedItem" class="space-y-4">
      <div class="text-center pb-4 border-b border-gray-100">
        <p class="text-3xl font-bold" :class="selectedItem.kind === 'income' ? 'text-income' : 'text-danger/80'">
          {{ selectedItem.kind === 'income' ? '+' : '-' }}{{ formatAmount(selectedItem.amount) }}
        </p>
        <p class="text-base font-medium text-gray-800 mt-1" :class="{ 'line-through': selectedItem.deletedAt }">
          {{ selectedItem.reason }}
        </p>
      </div>
      
      <div class="space-y-3 text-sm">
        <div class="flex justify-between items-center">
          <span class="text-gray-500 font-medium">Estado</span>
          <span class="font-bold px-2 py-0.5 rounded-md text-xs uppercase tracking-wide" :class="selectedItem.deletedAt ? 'bg-danger/10 text-danger' : 'bg-income/10 text-income'">
            {{ selectedItem.deletedAt ? 'Anulado' : 'Completado' }}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500 font-medium">Fecha</span>
          <span class="font-medium text-gray-900">{{ formatDate(selectedItem.createdAt) }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500 font-medium">Cuenta</span>
          <span class="font-medium text-gray-900">{{ getAccountName(selectedItem.accountId) }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500 font-medium">Método de pago</span>
          <span class="font-medium text-gray-900">{{ paymentLabel(selectedItem.paymentType) }}</span>
        </div>
        <div v-if="selectedItem.deletedAt" class="flex justify-between items-center">
          <span class="text-gray-500 font-medium">Razón anulación</span>
          <span class="font-medium text-danger">{{ selectedItem.deleteReason }}</span>
        </div>
      </div>

      <div v-if="selectedItem.description" class="pt-3 border-t border-gray-100">
        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Descripción</p>
        <p class="text-sm text-gray-700 bg-gray-50 border border-gray-100 p-3 rounded-xl break-words whitespace-pre-wrap leading-relaxed">
          {{ selectedItem.description }}
        </p>
      </div>
    </div>
  </AppFormDialog>
</template>