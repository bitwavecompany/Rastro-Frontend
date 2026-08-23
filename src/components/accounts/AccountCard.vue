<script setup lang="ts">
import type { Account } from '@/types/account'
import { formatAmount, getAccountIcon, getAccountColorClass } from '@/utils/formatters'
import { useTransactionsStore } from '@/stores/useTransactionsStore'

defineProps<{
  account: Account
}>()

defineEmits<{
  click: []
  delete: []
}>()

const transactionsStore = useTransactionsStore()
</script>

<template>
  <div
    @click="$emit('click')"
    class="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-start gap-4
           cursor-pointer hover:border-gray-300 hover:shadow-md transition-all group"
  >
    <div
      class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
      :class="getAccountColorClass(account.type)"
    >
      <Icon :icon="getAccountIcon(account.type)" class="w-5 h-5" />
    </div>

    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold text-gray-900 truncate">{{ account.name }}</p>
      <p class="text-base font-bold text-gray-900 mt-0.5">{{ formatAmount(transactionsStore.getAccountBalance(account.id, account.amount)) }}</p>
      <p class="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Saldo actual</p>
      <p v-if="account.description" class="text-xs text-gray-400 mt-1.5 truncate">
        {{ account.description }}
      </p>
      <span
        class="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium"
        :class="getAccountColorClass(account.type)"
      >
        {{ account.type === 'cash' ? 'Efectivo' : 'Banco' }}
      </span>
    </div>

    <div class="shrink-0 flex flex-col gap-0.5">
      <button
        v-if="account.id !== 1"
        @click.stop="$emit('delete')"
        class="p-1.5 rounded-md text-gray-300 hover:text-danger/80 hover:bg-danger/10 transition-colors"
        title="Eliminar"
      >
        <Icon icon="lucide:trash-2" class="w-4 h-4" />
      </button>
      <Icon
        icon="lucide:chevron-right"
        class="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors mt-1"
      />
    </div>
  </div>
</template>