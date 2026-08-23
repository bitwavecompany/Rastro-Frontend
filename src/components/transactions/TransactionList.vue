<script setup lang="ts">
import type { Transaction, TransactionKind } from '@/types/transaction'
import { formatAmount, formatDate, paymentLabel, paymentIcon } from '@/utils/formatters'
import { computed } from 'vue'

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
        <div
          v-for="item in items"
          :key="item.id"
          class="px-4 py-3 flex items-start gap-3 transition-colors"
          :class="item.deletedAt ? 'opacity-75 bg-gray-50/50' : 'hover:bg-gray-50/60'"
        >
          <div class="shrink-0 text-right min-w-[72px]" :class="{ 'line-through': item.deletedAt }">
            <p class="text-sm font-semibold text-gray-900">{{ formatAmount(item.amount) }}</p>
            <span
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium mt-1 whitespace-nowrap"
              :class="item.paymentType === 'cash' ? 'bg-income/20 text-income/90' : 'bg-primary/20 text-primary/90'"
            >
              <Icon :icon="paymentIcon(item.paymentType)" class="w-2.5 h-2.5" />
              {{ paymentLabel(item.paymentType) }}
            </span>
          </div>

          <div class="flex-1 min-w-0" :class="{ 'line-through': item.deletedAt }">
            <p class="text-sm font-medium text-gray-800 truncate">{{ item.reason }}</p>
            <p v-if="item.description" class="text-xs text-gray-400 truncate mt-0.5">
              {{ item.description }}
            </p>
            <p class="text-xs text-gray-400 mt-0.5">{{ formatDate(item.createdAt) }}</p>
          </div>

          <div class="shrink-0 flex items-center gap-0.5">
            <template v-if="!item.deletedAt">
              <button
                @click="emit('edit', item)"
                class="p-1.5 rounded-md text-gray-400 transition-colors"
                :class="editHoverClass"
                title="Editar"
              >
                <Icon icon="lucide:pencil" class="w-4 h-4" />
              </button>
              <button
                @click="emit('delete', item)"
                class="p-1.5 rounded-md text-gray-400 hover:text-danger hover:bg-danger/10 transition-colors"
                title="Eliminar"
              >
                <Icon icon="lucide:trash-2" class="w-4 h-4" />
              </button>
            </template>
            <span v-else class="text-[10px] font-bold text-danger/70 uppercase tracking-wider px-1">Anulado</span>
          </div>
        </div>
      </div>

      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Monto</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Razón</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Tipo</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Fecha</th>
              <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.id"
              class="border-b border-gray-50 last:border-0 transition-colors"
              :class="item.deletedAt ? 'opacity-75 bg-gray-50/50' : 'hover:bg-gray-50/60'"
            >
              <td class="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap" :class="{ 'line-through': item.deletedAt }">
                {{ formatAmount(item.amount) }}
              </td>
              <td class="px-6 py-4 text-gray-700 max-w-[160px] truncate" :class="{ 'line-through': item.deletedAt }">
                {{ item.reason }}
              </td>
              <td class="px-6 py-4" :class="{ 'opacity-80': item.deletedAt }">
                <span
                  class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                  :class="item.paymentType === 'cash' ? 'bg-income/20 text-income/90' : 'bg-primary/20 text-primary/90'"
                >
                  <Icon :icon="paymentIcon(item.paymentType)" class="w-3 h-3" />
                  {{ paymentLabel(item.paymentType) }}
                </span>
              </td>
              <td class="px-6 py-4 text-gray-400 max-w-xs truncate" :class="{ 'line-through': item.deletedAt }">
                <span v-if="item.description">{{ item.description }}</span>
                <span v-else class="text-gray-300">—</span>
              </td>
              <td class="px-6 py-4 text-gray-400 whitespace-nowrap text-xs">
                {{ formatDate(item.createdAt) }}
              </td>
              <td class="px-6 py-4 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1">
                  <template v-if="!item.deletedAt">
                    <button
                      @click="emit('edit', item)"
                      class="p-1.5 rounded-md text-gray-400 transition-colors"
                      :class="editHoverClass"
                      title="Editar"
                    >
                      <Icon icon="lucide:pencil" class="w-4 h-4" />
                    </button>
                    <button
                      @click="emit('delete', item)"
                      class="p-1.5 rounded-md text-gray-400 hover:text-danger hover:bg-danger/10 transition-colors"
                      title="Eliminar"
                    >
                      <Icon icon="lucide:trash-2" class="w-4 h-4" />
                    </button>
                  </template>
                  <span v-else class="text-xs font-bold text-danger/70 uppercase">Anulado</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>