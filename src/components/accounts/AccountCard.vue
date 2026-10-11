<script setup lang="ts">
import { computed } from 'vue'
import type { Account } from '@/types/account'
import { formatAmount, getAccountIcon, getAccountColorClass } from '@/utils/formatters'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import { useAccountsStore } from '@/stores/useAccountsStore'

const props = defineProps<{
  account: Account
}>()

defineEmits<{
  click: []
  delete: []
  restore: []
}>()

const transactionsStore = useTransactionsStore()
const accountsStore = useAccountsStore()

const isDeactivated = computed(() => Boolean(props.account.deletedAt || props.account.deleted_at))
const isDefault = computed(() => Boolean(props.account.is_default || props.account.id === accountsStore.defaultAccountId))
</script>

<template>
  <div
    @click="$emit('click')"
    class="bg-white rounded-2xl border shadow-sm p-5 flex items-start gap-4 cursor-pointer transition-all group"
    :class="[
      isDeactivated 
        ? 'opacity-70 bg-gray-50/70 border-dashed border-gray-300' 
        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
    ]"
  >
    <div
      class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
      :class="isDeactivated ? 'bg-gray-200 text-gray-500' : getAccountColorClass(account.type)"
    >
      <Icon :icon="getAccountIcon(account.type)" class="w-5 h-5" />
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <p class="text-sm font-semibold text-gray-900 truncate" :class="{ 'line-through text-gray-500': isDeactivated }">
          {{ account.name }}
        </p>
        <span v-if="isDefault" class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">
          Por defecto
        </span>
        <span v-if="isDeactivated" class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase">
          Desactivada
        </span>
      </div>

      <p class="text-base font-bold text-gray-900 mt-0.5">
        {{ formatAmount(transactionsStore.getAccountBalance(account.id, Number(account.initial_balance ?? account.amount ?? 0))) }}
      </p>
      <p class="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Saldo actual</p>
      
      <p v-if="account.description" class="text-xs text-gray-400 mt-1.5 truncate">
        {{ account.description }}
      </p>
      
      <span
        class="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium"
        :class="isDeactivated ? 'bg-gray-100 text-gray-500' : getAccountColorClass(account.type)"
      >
        {{ account.type === 'cash' ? 'Efectivo' : 'Banco' }}
      </span>
    </div>

    <div class="shrink-0 flex flex-col gap-1">
      <button
        v-if="!isDefault && !isDeactivated"
        @click.stop="$emit('delete')"
        class="p-1.5 rounded-md text-gray-300 hover:text-danger/80 hover:bg-danger/10 transition-colors"
        title="Desactivar cuenta"
      >
        <Icon icon="lucide:trash-2" class="w-4 h-4" />
      </button>

      <button
        v-if="isDeactivated"
        @click.stop="$emit('restore')"
        class="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
        title="Reactivar cuenta"
      >
        <Icon icon="lucide:rotate-ccw" class="w-4 h-4" />
      </button>

      <Icon
        icon="lucide:chevron-right"
        class="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors mt-1"
      />
    </div>
  </div>
</template>