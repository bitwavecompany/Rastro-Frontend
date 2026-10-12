<script setup lang="ts">
import { computed } from 'vue'
import type { Transaction } from '@/types/transaction'
import { formatAmount, formatDate } from '@/utils/formatters'
import { useAccountsStore } from '@/stores/useAccountsStore'

const props = withDefaults(
  defineProps<{
    item: Transaction
    showAccount?: boolean
  }>(),
  { showAccount: false }
)

const emit = defineEmits<{
  select: [item: Transaction]
}>()

const accountsStore = useAccountsStore()

const isDeactivated = computed(() => Boolean(props.item.deleted_at))

const accountName = computed(() => {
  const account = accountsStore.getAccountById(props.item.account_id)
  return account ? account.name : 'Desconocida'
})

const isIncome = computed(() => props.item.type === 'income')
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
    class="w-full text-left px-4 py-3 flex items-start gap-3 transition-all cursor-pointer active:bg-gray-100 active:scale-[0.98]"
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
        {{ formatDate(item.date || item.created_at || '') }}
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
</template>
