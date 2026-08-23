<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDashboard } from '@/composables/useDashboard'
import { formatAmount, formatDate, getAccountIcon, getAccountColorClass } from '@/utils/formatters'

const router = useRouter()
const {
  accounts,
  totalPatrimony,
  currentMonthExpenses,
  currentMonthIncomes,
  currentMonthBalance,
  recentTransactions,
  monthLabel,
  getAccountBalance
} = useDashboard()

const translatedMonthLabel = computed(() => {
  const months: Record<string, string> = {
    'January': 'enero', 'February': 'febrero', 'March': 'marzo', 'April': 'abril',
    'May': 'mayo', 'June': 'junio', 'July': 'julio', 'August': 'agosto',
    'September': 'septiembre', 'October': 'octubre', 'November': 'noviembre', 'December': 'diciembre'
  }
  return monthLabel.value.replace(/[a-zA-Z]+/, match => months[match] || match)
})
</script>

<template>
  <div class="min-h-full bg-gray-50 px-6 py-8">
    <div class="space-y-3">

      <div class="flex items-center justify-between gap-4 mb-2">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Inicio</h1>
          <p class="text-sm text-gray-400 mt-0.5 capitalize">{{ translatedMonthLabel }}</p>
        </div>
        <div class="flex items-center justify-center shrink-0">
          <img src="/imagotipo-blanco-big.jpg" alt="Rastro" class="h-10 w-auto object-contain" />
        </div>
      </div>

      <div class="bg-gray-900 rounded-3xl p-6 shadow-lg text-white relative overflow-hidden">
        <div class="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        <div class="absolute right-12 -bottom-10 w-24 h-24 bg-primary/20 rounded-full blur-xl pointer-events-none"></div>

        <div class="relative z-10">
          <p class="text-sm font-medium text-gray-400">Patrimonio total</p>
          <p class="text-4xl font-bold tracking-tight mt-1">{{ formatAmount(totalPatrimony) }}</p>
          <p class="text-xs text-gray-500 mt-2">{{ accounts.length }} cuenta{{ accounts.length !== 1 ? 's' : '' }}</p>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div class="bg-white rounded-2xl border border-income/20 shadow-sm p-4">
          <div class="flex items-center gap-1.5 mb-2">
            <Icon icon="lucide:trending-up" class="w-3.5 h-3.5 text-income" />
            <p class="text-xs text-income font-medium">Ingresos</p>
          </div>
          <p class="text-base font-bold text-income">{{ formatAmount(currentMonthIncomes) }}</p>
          <p class="text-xs text-gray-400 mt-0.5">este mes</p>
        </div>

        <div class="bg-white rounded-2xl border border-danger/20 shadow-sm p-4">
          <div class="flex items-center gap-1.5 mb-2">
            <Icon icon="lucide:trending-down" class="w-3.5 h-3.5 text-danger/80" />
            <p class="text-xs text-danger/80 font-medium">Gastos</p>
          </div>
          <p class="text-base font-bold text-danger/80">{{ formatAmount(currentMonthExpenses) }}</p>
          <p class="text-xs text-gray-400 mt-0.5">este mes</p>
        </div>

        <div
          class="bg-white rounded-2xl border shadow-sm p-4"
          :class="currentMonthBalance >= 0 ? 'border-gray-200' : 'border-danger/20'"
        >
          <div class="flex items-center gap-1.5 mb-2">
            <Icon icon="lucide:scale" class="w-3.5 h-3.5 text-gray-400" />
            <p class="text-xs text-gray-500 font-medium">Balance</p>
          </div>
          <p
            class="text-base font-bold"
            :class="currentMonthBalance >= 0 ? 'text-gray-900' : 'text-danger/80'"
          >
            {{ formatAmount(currentMonthBalance) }}
          </p>
          <p class="text-xs text-gray-400 mt-0.5">este mes</p>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-900">Cuentas</h2>
          <button
            @click="router.push({ name: 'accounts' })"
            class="text-xs text-primary font-medium hover:underline"
          >
            Ver todas
          </button>
        </div>
        <div class="divide-y divide-gray-50">
          <div
            v-for="account in accounts"
            :key="account.id"
            @click="router.push({ name: 'account-detail', params: { id: account.id } })"
            class="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/60 transition-colors cursor-pointer"
          >
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              :class="getAccountColorClass(account.type)"
            >
              <Icon :icon="getAccountIcon(account.type)" class="w-4 h-4" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">{{ account.name }}</p>
              <p class="text-xs text-gray-400">{{ account.type === 'cash' ? 'Efectivo' : 'Banco' }}</p>
            </div>
            <p class="text-sm font-semibold text-gray-900 shrink-0">{{ formatAmount(getAccountBalance(account.id, account.amount)) }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-900">Últimos movimientos</h2>
          <button
            @click="router.push({ name: 'expenses' })"
            class="text-xs text-primary font-medium hover:underline"
          >
            Ver gastos
          </button>
        </div>

        <div v-if="recentTransactions.length === 0" class="py-10 text-center">
          <Icon icon="lucide:inbox" class="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p class="text-sm text-gray-400">Sin movimientos recientes</p>
        </div>

        <div v-else class="divide-y divide-gray-50">
          <div
            v-for="t in recentTransactions"
            :key="`${t.kind}-${t.id}`"
            class="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/60 transition-colors cursor-pointer"
            @click="router.push({ name: t.kind === 'expense' ? 'expenses' : 'incomes' })"
          >
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              :class="t.kind === 'income' ? 'bg-income/20' : 'bg-danger/20'"
            >
              <Icon
                :icon="t.kind === 'income' ? 'lucide:trending-up' : 'lucide:receipt'"
                class="w-4 h-4"
                :class="t.kind === 'income' ? 'text-income' : 'text-danger/80'"
              />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">{{ t.reason }}</p>
              <p class="text-xs text-gray-400">{{ formatDate(t.createdAt) }}</p>
            </div>
            <p
              class="text-sm font-semibold shrink-0"
              :class="t.kind === 'income' ? 'text-income' : 'text-danger/80'"
            >
              {{ t.kind === 'income' ? '+' : '-' }}{{ formatAmount(t.amount) }}
            </p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>