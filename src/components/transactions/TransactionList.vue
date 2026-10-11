<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Transaction } from '@/types/transaction'
import type { TransactionKind } from '@/constants/transactions'
import MovementRow from '@/components/transactions/MovementRow.vue'
import AppFormDialog from '@/components/ui/AppFormDialog.vue'
import { formatAmount, formatDate, paymentLabel } from '@/utils/formatters'
import { useAccountsStore } from '@/stores/useAccountsStore'

const props = defineProps<{
  kind: TransactionKind
  items: Transaction[]
  deactivatedCount?: number
  hideDeactivated?: boolean
}>()

const emit = defineEmits<{
  edit: [item: Transaction]
  relocate: [item: Transaction]
  delete: [item: Transaction]
  restore: [item: Transaction]
  'hard-delete': [item: Transaction]
  'update:hideDeactivated': [val: boolean]
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

function handleRelocateFromDetail() {
  if (selectedItem.value) {
    emit('relocate', selectedItem.value)
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
  const account = accountsStore._rawAccounts.find(a => String(a.id) === String(accountId))
  return account ? account.name : 'Desconocida'
}
</script>

<template>
  <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
    <div class="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <h2 class="text-base font-semibold text-gray-900">{{ title }}</h2>
      <div class="flex items-center gap-3">
        <button
          v-if="(deactivatedCount ?? 0) > 0"
          type="button"
          @click="emit('update:hideDeactivated', !hideDeactivated)"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition"
          :class="hideDeactivated ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'"
        >
          <Icon :icon="hideDeactivated ? 'lucide:eye' : 'lucide:eye-off'" class="w-3.5 h-3.5" />
          {{ hideDeactivated ? `Mostrar desactivados (${deactivatedCount})` : 'Ocultar desactivados' }}
        </button>
        <span class="text-xs text-gray-400 font-medium">
          {{ items.length }} registro{{ items.length !== 1 ? 's' : '' }}
        </span>
      </div>
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
          @relocate="emit('relocate', $event)"
          @delete="emit('delete', $event)"
          @restore="emit('restore', $event)"
          @hard-delete="emit('hard-delete', $event)"
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
              @relocate="emit('relocate', $event)"
              @delete="emit('delete', $event)"
              @restore="emit('restore', $event)"
              @hard-delete="emit('hard-delete', $event)"
            />
          </tbody>
        </table>
      </div>
    </template>
  </div>

  <AppFormDialog
    v-model:open="isDetailOpen"
    title="Detalle del movimiento"
    :confirm-label="(selectedItem?.deletedAt || selectedItem?.deleted_at) ? 'Aceptar' : 'Editar'"
    :cancel-label="(selectedItem?.deletedAt || selectedItem?.deleted_at) ? 'Cerrar' : 'Desactivar'"
    @confirm="(selectedItem?.deletedAt || selectedItem?.deleted_at) ? (isDetailOpen = false) : handleEditFromDetail()"
    @cancel="(selectedItem?.deletedAt || selectedItem?.deleted_at) ? (isDetailOpen = false) : handleDeleteFromDetail()"
  >
    <div v-if="selectedItem" class="space-y-4">
      <div class="text-center pb-4 border-b border-gray-100">
        <p class="text-3xl font-bold" :class="(selectedItem.kind === 'income' || selectedItem.type === 'income') ? 'text-income' : 'text-danger/80'">
          {{ (selectedItem.kind === 'income' || selectedItem.type === 'income') ? '+' : '-' }}{{ formatAmount(selectedItem.amount) }}
        </p>
        <p class="text-base font-medium text-gray-800 mt-1" :class="{ 'line-through text-gray-400': (selectedItem.deletedAt || selectedItem.deleted_at) }">
          {{ selectedItem.reason }}
        </p>
      </div>
      
      <div class="space-y-3 text-sm">
        <div class="flex justify-between items-center">
          <span class="text-gray-500 font-medium">Estado</span>
          <span class="font-bold px-2 py-0.5 rounded-md text-xs uppercase tracking-wide" :class="(selectedItem.deletedAt || selectedItem.deleted_at) ? 'bg-amber-100 text-amber-700' : 'bg-income/10 text-income'">
            {{ (selectedItem.deletedAt || selectedItem.deleted_at) ? 'Desactivado' : 'Activo' }}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500 font-medium">Fecha</span>
          <span class="font-medium text-gray-900">{{ formatDate(selectedItem.date || selectedItem.createdAt || '') }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500 font-medium">Cuenta</span>
          <span class="font-medium text-gray-900">{{ getAccountName(selectedItem.account_id || selectedItem.accountId) }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500 font-medium">Método de pago</span>
          <span class="font-medium text-gray-900">{{ paymentLabel(selectedItem.payment_method || selectedItem.paymentType) }}</span>
        </div>
        <div v-if="selectedItem.deletedAt || selectedItem.deleted_at" class="flex justify-between items-center">
          <span class="text-gray-500 font-medium">Motivo desactivación</span>
          <span class="font-medium text-amber-700">{{ selectedItem.deletion_reason || selectedItem.deleteReason || 'Sin especificar' }}</span>
        </div>
      </div>

      <div v-if="selectedItem.description" class="pt-3 border-t border-gray-100">
        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Descripción</p>
        <p class="text-sm text-gray-700 bg-gray-50 border border-gray-100 p-3 rounded-xl break-words whitespace-pre-wrap leading-relaxed">
          {{ selectedItem.description }}
        </p>
      </div>

      <div v-if="!selectedItem.deletedAt && !selectedItem.deleted_at" class="pt-2">
        <button
          type="button"
          @click="handleRelocateFromDetail"
          class="w-full py-2.5 px-3 rounded-xl border border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100/60 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
        >
          <Icon icon="lucide:arrow-right-left" class="w-4 h-4" />
          Trasladar a otra cuenta
        </button>
      </div>
    </div>
  </AppFormDialog>
</template>