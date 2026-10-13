<script setup lang="ts">
import { computed } from 'vue'
import type { Transaction } from '@/types/transaction'
import { formatAmount, formatDate } from '@/utils/formatters'
import { getCategoryIcon, getCategoryName } from '@/constants/categories'
import { useAccountsStore } from '@/stores/useAccountsStore'

const props = withDefaults(
  defineProps<{
    item: Transaction
    editHoverClass?: string
    showAccount?: boolean
  }>(),
  { showAccount: false }
)

const emit = defineEmits<{
  edit: [item: Transaction]
  relocate: [item: Transaction]
  delete: [item: Transaction]
  restore: [item: Transaction]
  'hard-delete': [item: Transaction]
}>()

const accountsStore = useAccountsStore()

const isDeactivated = computed(() => Boolean(props.item.deleted_at))

const accountName = computed(() => {
  const account = accountsStore.getAccountById(props.item.account_id)
  return account ? account.name : 'Desconocida'
})

const isIncome = computed(() => props.item.type === 'income')
const kindIcon = computed(() => isIncome.value ? 'lucide:trending-up' : getCategoryIcon(props.item.category))
const kindColorIcon = computed(() => isIncome.value ? 'text-income' : 'text-danger/80')
const kindColorBg = computed(() => isIncome.value ? 'bg-income/20' : 'bg-danger/20')
const kindColorText = computed(() => isIncome.value ? 'text-income' : 'text-danger/80')
const amountPrefix = computed(() => isIncome.value ? '+' : '-')
</script>

<template>
  <tr
    class="border-b border-gray-50 last:border-0 transition-colors"
    :class="isDeactivated ? 'opacity-65 bg-gray-50/70' : 'hover:bg-gray-50/60'"
  >
    <td class="px-6 py-4">
      <div
        class="w-7 h-7 rounded-lg flex items-center justify-center"
        :class="isDeactivated ? 'bg-gray-200 text-gray-500' : kindColorBg"
      >
        <Icon :icon="kindIcon" class="w-3.5 h-3.5" :class="isDeactivated ? 'text-gray-500' : kindColorIcon" />
      </div>
    </td>
    <td class="px-6 py-4 text-gray-700 max-w-[160px] truncate font-medium" :class="{ 'line-through text-gray-400': isDeactivated }">
      <div class="truncate">{{ item.reason }}</div>
      <div v-if="!isIncome && item.category" class="text-[11px] text-gray-400 font-normal truncate">
        {{ getCategoryName(item.category) }}
      </div>
    </td>
    <td class="px-6 py-4 text-gray-500 max-w-xs truncate" :class="{ 'line-through text-gray-400': isDeactivated }">
      <span v-if="item.description">{{ item.description }}</span>
      <span v-else class="text-gray-400">—</span>
    </td>
    <td v-if="showAccount" class="px-6 py-4 text-gray-600 whitespace-nowrap text-xs font-medium" :class="{ 'line-through text-gray-400': isDeactivated }">
      {{ accountName }}
    </td>
    <td class="px-6 py-4 text-gray-500 whitespace-nowrap text-xs">
      {{ formatDate(item.date || item.created_at || '') }}
    </td>
    <td
      class="px-6 py-4 text-right font-semibold whitespace-nowrap"
      :class="[isDeactivated ? 'text-gray-400 line-through' : kindColorText]"
    >
      {{ amountPrefix }}{{ formatAmount(item.amount) }}
    </td>
    <td class="px-6 py-4 text-right whitespace-nowrap">
      <div class="flex items-center justify-end gap-1">
        <template v-if="!isDeactivated">
          <button
            type="button"
            @click="emit('edit', item)"
            class="p-1.5 rounded-md text-gray-500 transition-colors cursor-pointer"
            :class="editHoverClass ?? 'hover:text-primary hover:bg-primary/10'"
            title="Editar"
            aria-label="Editar movimiento"
          >
            <Icon icon="lucide:pencil" class="w-4 h-4" />
          </button>
          <button
            type="button"
            @click="emit('relocate', item)"
            class="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
            title="Trasladar a otra cuenta"
            aria-label="Trasladar movimiento"
          >
            <Icon icon="lucide:arrow-right-left" class="w-4 h-4" />
          </button>
          <button
            type="button"
            @click="emit('delete', item)"
            class="p-1.5 rounded-md text-gray-500 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
            title="Desactivar"
            aria-label="Desactivar movimiento"
          >
            <Icon icon="lucide:trash-2" class="w-4 h-4" />
          </button>
        </template>
        <template v-else>
          <button
            type="button"
            @click="emit('restore', item)"
            class="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
            title="Reactivar movimiento"
          >
            <Icon icon="lucide:rotate-ccw" class="w-4 h-4" />
          </button>
          <button
            type="button"
            @click="emit('hard-delete', item)"
            class="p-1.5 rounded-md text-danger hover:bg-danger/10 transition-colors cursor-pointer"
            title="Eliminar permanentemente"
          >
            <Icon icon="lucide:x-circle" class="w-4 h-4" />
          </button>
        </template>
      </div>
    </td>
  </tr>
</template>
