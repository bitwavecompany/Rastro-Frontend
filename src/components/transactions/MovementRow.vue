<script setup lang="ts">
import { computed } from 'vue'
import type { Transaction } from '@/types/transaction'
import { formatAmount, formatDate } from '@/utils/formatters'
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
  select: [item: Transaction]
}>()

const accountsStore = useAccountsStore()

const isDeactivated = computed(() => Boolean(props.item.deletedAt || props.item.deleted_at))

const accountName = computed(() => {
  const account = accountsStore._rawAccounts.find(
    a => String(a.id) === String(props.item.account_id || props.item.accountId)
  )
  return account ? account.name : 'Desconocida'
})

const isIncome = computed(() => props.item.kind === 'income' || props.item.type === 'income')
const kindIcon = computed(() => isIncome.value ? 'lucide:trending-up' : 'lucide:receipt')
const kindColorIcon = computed(() => isIncome.value ? 'text-income' : 'text-danger/80')
const kindColorBg = computed(() => isIncome.value ? 'bg-income/20' : 'bg-danger/20')
const kindColorText = computed(() => isIncome.value ? 'text-income' : 'text-danger/80')
const amountPrefix = computed(() => isIncome.value ? '+' : '-')
</script>

<template>
  <button
    type="button"
    @click="emit('select', item)"
    class="w-full text-left px-4 py-3 flex items-start gap-3 transition-all md:hidden cursor-pointer active:bg-gray-100 active:scale-[0.98]"
    :class="isDeactivated ? 'opacity-65 bg-gray-50/70 border-l-2 border-amber-400' : 'hover:bg-gray-50/60'"
  >
    <div
      class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
      :class="isDeactivated ? 'bg-gray-200 text-gray-500' : kindColorBg"
    >
      <Icon :icon="kindIcon" class="w-3.5 h-3.5" :class="isDeactivated ? 'text-gray-500' : kindColorIcon" />
    </div>

    <div class="flex-1 min-w-0" :class="{ 'line-through text-gray-500': isDeactivated }">
      <p class="text-sm font-medium text-gray-800 truncate">{{ item.reason }}</p>
      <p class="text-xs text-gray-500 mt-0.5 truncate">
        <span v-if="showAccount" class="font-medium text-gray-600">{{ accountName }} &middot; </span>
        {{ formatDate(item.date || item.createdAt || '') }}
      </p>
    </div>

    <div class="shrink-0 flex items-center gap-0.5">
      <p
        class="text-sm font-semibold"
        :class="[isDeactivated ? 'text-gray-400 line-through' : kindColorText]"
      >
        {{ amountPrefix }}{{ formatAmount(item.amount) }}
      </p>
      <span v-if="isDeactivated" class="text-[9px] font-bold text-amber-700 bg-amber-100 uppercase tracking-wider px-1.5 py-0.5 rounded ml-1">
        Desactivado
      </span>
    </div>
  </button>

  <tr
    class="border-b border-gray-50 last:border-0 transition-colors hidden md:table-row"
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
      {{ item.reason }}
    </td>
    <td class="px-6 py-4 text-gray-500 max-w-xs truncate" :class="{ 'line-through text-gray-400': isDeactivated }">
      <span v-if="item.description">{{ item.description }}</span>
      <span v-else class="text-gray-400">—</span>
    </td>
    <td v-if="showAccount" class="px-6 py-4 text-gray-600 whitespace-nowrap text-xs font-medium" :class="{ 'line-through text-gray-400': isDeactivated }">
      {{ accountName }}
    </td>
    <td class="px-6 py-4 text-gray-500 whitespace-nowrap text-xs">
      {{ formatDate(item.date || item.createdAt || '') }}
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
            @click.stop="emit('edit', item)"
            class="p-1.5 rounded-md text-gray-500 transition-colors"
            :class="editHoverClass ?? 'hover:text-primary hover:bg-primary/10'"
            title="Editar"
            aria-label="Editar movimiento"
          >
            <Icon icon="lucide:pencil" class="w-4 h-4" />
          </button>
          <button
            type="button"
            @click.stop="emit('relocate', item)"
            class="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Trasladar a otra cuenta"
            aria-label="Trasladar movimiento"
          >
            <Icon icon="lucide:arrow-right-left" class="w-4 h-4" />
          </button>
          <button
            type="button"
            @click.stop="emit('delete', item)"
            class="p-1.5 rounded-md text-gray-500 hover:text-danger hover:bg-danger/10 transition-colors"
            title="Desactivar"
            aria-label="Desactivar movimiento"
          >
            <Icon icon="lucide:trash-2" class="w-4 h-4" />
          </button>
        </template>
        <template v-else>
          <button
            type="button"
            @click.stop="emit('restore', item)"
            class="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
            title="Reactivar movimiento"
          >
            <Icon icon="lucide:rotate-ccw" class="w-4 h-4" />
          </button>
          <button
            type="button"
            @click.stop="emit('hard-delete', item)"
            class="p-1.5 rounded-md text-danger hover:bg-danger/10 transition-colors"
            title="Eliminar permanentemente"
          >
            <Icon icon="lucide:x-circle" class="w-4 h-4" />
          </button>
        </template>
      </div>
    </td>
  </tr>
</template>