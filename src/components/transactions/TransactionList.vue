<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Transaction } from '@/types/transaction'
import type { TransactionType } from '@/constants/transactions'
import MovementListItem from '@/components/transactions/MovementListItem.vue'
import MovementTableRow from '@/components/transactions/MovementTableRow.vue'
import MovementDetailModal from '@/components/transactions/MovementDetailModal.vue'

const props = defineProps<{
  type: TransactionType
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

const title = computed(() =>
  props.type === 'expense' ? 'Historial de gastos' : 'Historial de ingresos'
)

const emptyLabel = computed(() =>
  props.type === 'expense' ? 'Sin gastos registrados' : 'Sin ingresos registrados'
)

const emptyHint = computed(() =>
  props.type === 'expense'
    ? 'Agrega tu primer gasto usando el formulario.'
    : 'Agrega tu primer ingreso usando el formulario.'
)

const editHoverClass = computed(() =>
  props.type === 'expense'
    ? 'hover:text-primary hover:bg-primary/10'
    : 'hover:text-income hover:bg-income/10'
)

const selectedItem = ref<Transaction | null>(null)
const isDetailOpen = ref(false)

function openDetails(item: Transaction) {
  selectedItem.value = item
  isDetailOpen.value = true
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
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition cursor-pointer"
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
      <!-- Mobile list view -->
      <div class="divide-y divide-gray-50 md:hidden">
        <MovementListItem
          v-for="item in items"
          :key="item.id"
          :item="item"
          :show-account="true"
          @select="openDetails"
        />
      </div>

      <!-- Desktop table view -->
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
            <MovementTableRow
              v-for="item in items"
              :key="item.id"
              :item="item"
              :edit-hover-class="editHoverClass"
              :show-account="true"
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

  <!-- Mobile Detail & Actions Modal -->
  <MovementDetailModal
    v-model:open="isDetailOpen"
    :item="selectedItem"
    @edit="emit('edit', $event)"
    @relocate="emit('relocate', $event)"
    @delete="emit('delete', $event)"
    @restore="emit('restore', $event)"
    @hard-delete="emit('hard-delete', $event)"
  />
</template>