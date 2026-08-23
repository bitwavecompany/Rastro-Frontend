<script setup lang="ts">
import type { Transaction } from '@/types/transaction'
import { formatAmount, formatDate } from '@/utils/formatters'

const props = defineProps<{
  item: Transaction
  editHoverClass?: string
}>()

const emit = defineEmits<{
  edit: [item: Transaction]
  delete: [item: Transaction]
}>()

const kindIcon = props.item.kind === 'income' ? 'lucide:trending-up' : 'lucide:receipt'
const kindColorIcon = props.item.kind === 'income' ? 'text-income' : 'text-danger/80'
const kindColorBg = props.item.kind === 'income' ? 'bg-income/20' : 'bg-danger/20'
const kindColorText = props.item.kind === 'income' ? 'text-income' : 'text-danger/80'
const amountPrefix = props.item.kind === 'income' ? '+' : '-'
</script>

<template>
  <div
    class="px-4 py-3 flex items-start gap-3 transition-colors md:hidden"
    :class="item.deletedAt ? 'opacity-75 bg-gray-50/50' : 'hover:bg-gray-50/60'"
  >
    <div
      class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
      :class="kindColorBg"
    >
      <Icon :icon="kindIcon" class="w-3.5 h-3.5" :class="kindColorIcon" />
    </div>

    <div class="flex-1 min-w-0" :class="{ 'line-through': item.deletedAt }">
      <p class="text-sm font-medium text-gray-800 truncate">{{ item.reason }}</p>
      <p v-if="item.description" class="text-xs text-gray-400 truncate mt-0.5">{{ item.description }}</p>
      <p class="text-xs text-gray-400 mt-0.5">{{ formatDate(item.createdAt) }}</p>
    </div>

    <div class="shrink-0 flex items-center gap-0.5">
      <p
        class="text-sm font-semibold mr-2"
        :class="[kindColorText, { 'line-through': item.deletedAt }]"
      >
        {{ amountPrefix }}{{ formatAmount(item.amount) }}
      </p>
      <template v-if="!item.deletedAt">
        <button
          @click="emit('edit', item)"
          class="p-1.5 rounded-md text-gray-400 transition-colors"
          :class="editHoverClass ?? 'hover:text-primary hover:bg-primary/10'"
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

  <tr
    class="border-b border-gray-50 last:border-0 transition-colors hidden md:table-row"
    :class="item.deletedAt ? 'opacity-75 bg-gray-50/50' : 'hover:bg-gray-50/60'"
  >
    <td class="px-6 py-4" :class="{ 'opacity-80': item.deletedAt }">
      <div class="w-7 h-7 rounded-lg flex items-center justify-center" :class="kindColorBg">
        <Icon :icon="kindIcon" class="w-3.5 h-3.5" :class="kindColorIcon" />
      </div>
    </td>
    <td class="px-6 py-4 text-gray-700 max-w-[160px] truncate font-medium" :class="{ 'line-through': item.deletedAt }">
      {{ item.reason }}
    </td>
    <td class="px-6 py-4 text-gray-400 max-w-xs truncate" :class="{ 'line-through': item.deletedAt }">
      <span v-if="item.description">{{ item.description }}</span>
      <span v-else class="text-gray-300">—</span>
    </td>
    <td class="px-6 py-4 text-gray-400 whitespace-nowrap text-xs">
      {{ formatDate(item.createdAt) }}
    </td>
    <td
      class="px-6 py-4 text-right font-semibold whitespace-nowrap"
      :class="[kindColorText, { 'line-through': item.deletedAt }]"
    >
      {{ amountPrefix }}{{ formatAmount(item.amount) }}
    </td>
    <td class="px-6 py-4 text-right whitespace-nowrap">
      <div class="flex items-center justify-end gap-1">
        <template v-if="!item.deletedAt">
          <button
            @click="emit('edit', item)"
            class="p-1.5 rounded-md text-gray-400 transition-colors"
            :class="editHoverClass ?? 'hover:text-primary hover:bg-primary/10'"
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
</template>