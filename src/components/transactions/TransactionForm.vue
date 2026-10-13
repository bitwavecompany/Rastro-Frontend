<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import { useEntitlementsStore } from '@/stores/useEntitlementsStore'
import { useCategories } from '@/composables/useCategories'
import AppAmountInput from '@/components/ui/AppAmountInput.vue'
import AppTypeToggle from '@/components/ui/AppTypeToggle.vue'
import type { Transaction, CreateTransactionPayload } from '@/types/transaction'
import type { PaymentMethod, TransactionType } from '@/constants/transactions'

const props = withDefaults(
  defineProps<{
    type: TransactionType
    disabled?: boolean
    editingItem?: Transaction | null
  }>(),
  { disabled: false, editingItem: null }
)

const emit = defineEmits<{
  submit: [payload: CreateTransactionPayload]
  cancel: []
}>()

const router = useRouter()
const accountsStore = useAccountsStore()
const transactionsStore = useTransactionsStore()
const entitlements = useEntitlementsStore()
const { categories, getCategoryIcon } = useCategories()

const amount = ref<number | ''>('')
const reason = ref('')
const description = ref('')
const payment_method = ref<PaymentMethod>('cash')
const account_id = ref<string>('')
const date = ref(dayjs().format('YYYY-MM-DD'))
const category = ref<string>('comida')
const errors = ref<Partial<Record<'amount' | 'reason' | 'account_id' | 'date' | 'category', string>>>({})

// PRD Rule 1: Payment method reactively filters available accounts (cash -> cash, transfer -> bank)
const targetAccountType = computed(() => payment_method.value === 'cash' ? 'cash' : 'bank')
const availableAccounts = computed(() => {
  return accountsStore.accounts.filter(a => a.type === targetAccountType.value)
})

watch(
  () => [availableAccounts.value, accountsStore.isLoaded] as const,
  ([newAccounts]) => {
    const isValid = newAccounts.some(a => a.id === account_id.value)
    if (!isValid) {
      account_id.value = newAccounts.length > 0 ? newAccounts[0].id : ''
    }
  },
  { immediate: true }
)

// PRD Rule 2: Empty accounts list shows contextual call-to-action message
const emptyAccountsMessage = computed(() => {
  if (availableAccounts.value.length > 0) return null
  if (payment_method.value === 'transfer') {
    if (entitlements.isGuest) {
      return {
        text: 'Necesitas una cuenta bancaria para registrar transferencias. Regístrate gratis para crearla.',
        actionLabel: 'Crear cuenta gratis',
        actionRoute: '/register',
      }
    } else {
      return {
        text: 'Crea una cuenta de tipo banco para registrar transferencias.',
        actionLabel: 'Crear cuenta bancaria',
        actionRoute: '/accounts',
      }
    }
  } else {
    return {
      text: 'No tienes cuentas en efectivo activas disponibles para este método de pago.',
      actionLabel: null,
      actionRoute: null,
    }
  }
})

const overdraftWarning = computed(() => {
  if (props.type !== 'expense') return false
  if (!account_id.value || !amount.value || Number(amount.value) <= 0) return false
  const account = accountsStore.accounts.find(a => a.id === account_id.value)
  if (!account) return false

  const currentBalance = transactionsStore.getAccountBalance(account.id, Number(account.initial_balance ?? 0))
  const availableBalance = props.editingItem ? currentBalance + Number(props.editingItem.amount) : currentBalance

  return Number(amount.value) > availableBalance
})

const ringClass = computed(() => props.type === 'expense' ? 'ring-primary/20 border-primary/50' : 'ring-income/20 border-green-300')
const focusClass = computed(() => props.type === 'expense' ? 'focus:ring-primary/100' : 'focus:ring-income/100')
const activeClass = computed(() => props.type === 'expense' ? 'bg-primary text-white' : 'bg-income text-white')
const btnClass = computed(() => props.type === 'expense'
  ? 'bg-primary text-white hover:bg-primary/90 active:bg-primary/80'
  : 'bg-income text-white hover:bg-income/90 active:bg-green-800'
)

const isEditing = computed(() => props.editingItem !== null)

const paymentOptions: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'Efectivo', icon: 'lucide:banknote' },
  { value: 'transfer', label: 'Transferencia', icon: 'lucide:arrow-right-left' },
]

function resetForm() {
  amount.value = ''
  reason.value = ''
  description.value = ''
  payment_method.value = 'cash'
  account_id.value = availableAccounts.value.length > 0 ? availableAccounts.value[0].id : ''
  date.value = dayjs().format('YYYY-MM-DD')
  category.value = props.type === 'expense' ? 'comida' : ''
  errors.value = {}
}

watch(
  () => props.editingItem,
  (item) => {
    if (item) {
      amount.value = item.amount
      reason.value = item.reason
      description.value = item.description ?? ''
      payment_method.value = item.payment_method || 'cash'
      account_id.value = item.account_id
      date.value = dayjs(item.date || item.created_at).format('YYYY-MM-DD')
      category.value = props.type === 'expense' ? (item.category || 'otros') : ''
      errors.value = {}
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

function validate(): boolean {
  errors.value = {}
  if (!amount.value || Number(amount.value) <= 0) errors.value.amount = 'Requerido mayor a 0'
  if (!reason.value.trim()) errors.value.reason = 'Requerido'
  if (!account_id.value || availableAccounts.value.length === 0) {
    errors.value.account_id = emptyAccountsMessage.value?.text || 'Requerido'
  }
  if (props.type === 'expense') {
    if (!category.value || !category.value.trim()) {
      errors.value.category = 'Selecciona una categoría'
    }
  }
  // PRD Rule 6: Validate account type matches payment method
  const selected = accountsStore.accounts.find(a => a.id === account_id.value)
  if (selected && selected.type !== targetAccountType.value) {
    errors.value.account_id = 'El tipo de cuenta debe coincidir con el método de pago'
  }
  return Object.keys(errors.value).length === 0
}

function handleSubmit() {
  if (props.disabled || availableAccounts.value.length === 0 || !validate()) return
  emit('submit', {
    type: props.type,
    amount: Number(amount.value),
    reason: reason.value.trim(),
    payment_method: payment_method.value,
    account_id: account_id.value,
    date: date.value || dayjs().format('YYYY-MM-DD'),
    description: description.value.trim() ? description.value.trim() : null,
    category: props.type === 'expense' ? (category.value || 'otros') : null,
  })
  resetForm()
}

function handleCancel() {
  resetForm()
  emit('cancel')
}
</script>

<template>
  <div
    class="bg-white rounded-2xl border shadow-sm p-5 space-y-5 transition-all"
    :class="isEditing ? `${ringClass} ring-2` : 'border-gray-200'"
  >
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <label for="input-reason" class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          Razón / Motivo <span class="text-danger/60">*</span>
        </label>
        <input
          id="input-reason"
          v-model="reason"
          type="text"
          placeholder="Ej: Pago de servicios, Venta de producto..."
          :disabled="disabled"
          class="w-full px-3 py-2 rounded-lg border text-sm text-gray-900 placeholder-gray-400
                 focus:outline-none focus:ring-2 focus:border-transparent
                 disabled:bg-gray-50 disabled:text-gray-400 transition"
          :class="[focusClass, errors.reason ? 'border-danger/60 bg-danger/10' : 'border-gray-300']"
        />
        <p v-if="errors.reason" class="mt-1 text-xs text-danger/80 leading-tight">{{ errors.reason }}</p>
      </div>

      <div class="sm:w-44 shrink-0">
        <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          Monto <span class="text-danger/60">*</span>
        </label>
        <AppAmountInput
          v-model="amount"
          :error="errors.amount"
          :disabled="disabled"
          :focus-class="focusClass"
        />
        <p v-if="overdraftWarning" class="mt-1 text-[11px] text-amber-600 font-medium leading-tight flex items-start gap-1">
          <Icon icon="lucide:triangle-alert" class="w-3.5 h-3.5 shrink-0 mt-0.5" /> Este gasto dejará la cuenta en saldo negativo
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4" :class="props.type === 'expense' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'">
      <!-- Selector de categoría obligatorio exclusivo para Gastos -->
      <div v-if="props.type === 'expense'">
        <label for="select-category" class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          Categoría <span class="text-danger/60">*</span>
        </label>
        <div class="relative">
          <Icon
            :icon="getCategoryIcon(category)"
            class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
          />
          <select
            id="select-category"
            v-model="category"
            :disabled="disabled"
            class="w-full pl-9 pr-8 py-2 rounded-lg border text-sm text-gray-900 appearance-none
                   focus:outline-none focus:ring-2 focus:border-transparent
                   disabled:bg-gray-50 disabled:text-gray-400 transition bg-white"
            :class="[focusClass, errors.category ? 'border-danger/60 bg-danger/10' : 'border-gray-300']"
          >
            <option value="" disabled>Selecciona una categoría</option>
            <option
              v-for="cat in categories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.name }}
            </option>
          </select>
          <Icon
            icon="lucide:chevron-down"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
          />
        </div>
        <p v-if="errors.category" class="mt-1 text-xs text-danger/80 leading-tight">{{ errors.category }}</p>
      </div>

      <div>
        <label for="input-date" class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          Fecha
        </label>
        <input
          id="input-date"
          v-model="date"
          type="date"
          :disabled="disabled"
          class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900
                 focus:outline-none focus:ring-2 focus:border-transparent
                 disabled:bg-gray-50 disabled:text-gray-400 transition"
          :class="focusClass"
        />
      </div>

      <div>
        <label for="input-desc" class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          Descripción
        </label>
        <input
          id="input-desc"
          v-model="description"
          type="text"
          placeholder="Detalles adicionales (opcional)"
          :disabled="disabled"
          class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400
                 focus:outline-none focus:ring-2 focus:border-transparent
                 disabled:bg-gray-50 disabled:text-gray-400 transition"
          :class="focusClass"
        />
      </div>
    </div>

    <div class="flex flex-col sm:flex-row gap-4 sm:items-end">
      <div class="sm:w-56 shrink-0">
        <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          Método de pago
        </label>
        <AppTypeToggle
          v-model="payment_method"
          :options="paymentOptions"
          :disabled="disabled"
          :active-class="activeClass"
        />
      </div>

      <div class="flex-1">
        <label for="select-account" class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          Cuenta <span class="text-danger/60">*</span>
        </label>
        <div class="relative">
          <Icon
            icon="lucide:wallet"
            class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
          />
          <select
            id="select-account"
            v-model="account_id"
            :disabled="disabled || availableAccounts.length === 0"
            class="w-full pl-8 pr-8 py-2 rounded-lg border text-sm text-gray-900 appearance-none
                   focus:outline-none focus:ring-2 focus:border-transparent
                   disabled:bg-gray-50 disabled:text-gray-400 transition bg-white"
            :class="[focusClass, errors.account_id ? 'border-danger/60 bg-danger/10' : 'border-gray-300']"
          >
            <option v-if="availableAccounts.length === 0" value="" disabled>
              Sin cuentas disponibles
            </option>
            <option
              v-for="account in availableAccounts"
              :key="account.id"
              :value="account.id"
            >
              {{ account.name }} ({{ account.type === 'cash' ? 'Efectivo' : 'Banco' }})
            </option>
          </select>
          <Icon
            icon="lucide:chevron-down"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
          />
        </div>

        <!-- PRD Rule 2: Contextual CTA when accounts list is empty -->
        <div
          v-if="emptyAccountsMessage"
          class="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xs"
        >
          <div class="flex items-start gap-2">
            <Icon icon="lucide:info" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span class="leading-relaxed">{{ emptyAccountsMessage.text }}</span>
          </div>
          <button
            v-if="emptyAccountsMessage.actionLabel"
            type="button"
            @click="router.push(emptyAccountsMessage.actionRoute!)"
            class="shrink-0 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
          >
            {{ emptyAccountsMessage.actionLabel }}
          </button>
        </div>

        <p v-else-if="errors.account_id" class="mt-1 text-xs text-danger/80 leading-tight">{{ errors.account_id }}</p>
      </div>

      <div class="flex gap-2 shrink-0 pt-2 sm:pt-0">
        <button
          v-if="isEditing"
          type="button"
          @click="handleCancel"
          :aria-disabled="disabled"
          class="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap
                 border border-gray-200 text-gray-500 hover:bg-gray-100"
          :class="{ 'opacity-60 pointer-events-none': disabled }"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="handleSubmit"
          :disabled="disabled || availableAccounts.length === 0 || !account_id"
          :aria-disabled="disabled || availableAccounts.length === 0 || !account_id"
          class="flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap"
          :class="[btnClass, { 'opacity-50 pointer-events-none cursor-not-allowed': disabled || availableAccounts.length === 0 || !account_id }]"
        >
          {{ disabled ? 'Guardando…' : isEditing ? 'Actualizar' : 'Guardar' }}
        </button>
      </div>
    </div>
  </div>
</template>