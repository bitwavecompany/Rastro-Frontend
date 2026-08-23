<script setup lang="ts">
import type { Transaction, TransactionKind } from '@/types/transaction'
import { computed } from 'vue'
import MovementRow from '@/components/transactions/MovementRow.vue'

const props = defineProps<{
  kind: TransactionKind
  items: Transaction[]
}>()

const emit = defineEmits<{
  edit: [item: Transaction]
  delete: [item: Transaction]
}>()

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
              @edit="emit('edit', $event)"
              @delete="emit('delete', $event)"
            />
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>