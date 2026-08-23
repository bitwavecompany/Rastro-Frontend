<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useAccountsStore } from '@/stores/useAccountsStore'
import AppAmountInput from '@/components/ui/AppAmountInput.vue'
import AppTypeToggle from '@/components/ui/AppTypeToggle.vue'
import type { Transaction, CreateTransactionPayload, PaymentType, TransactionKind } from '@/types/transaction'

const props = withDefaults(
  defineProps<{
    kind:         TransactionKind
    disabled?:    boolean
    editingItem?: Transaction | null
  }>(),
  { disabled: false, editingItem: null }
)

const emit = defineEmits<{
  submit: [payload: CreateTransactionPayload]
  cancel: []
}>()

const accountsStore = useAccountsStore()

const amount      = ref<number | ''>('')
const reason      = ref('')
const description = ref('')
const paymentType = ref<PaymentType>('cash')
const accountId   = ref<number | ''>('')
const errors      = ref<Partial<Record<'amount' | 'reason' | 'accountId', string>>>({})

const filteredAccounts = computed(() => {
  const targetType = paymentType.value === 'cash' ? 'cash' : 'bank'
  return accountsStore.accounts.filter(a => a.type === targetType)
})

watch(filteredAccounts, (newAccounts) => {
  const isValid = newAccounts.some(a => a.id === accountId.value)
  if (!isValid) {
    accountId.value = newAccounts.length > 0 ? newAccounts[0].id : ''
  }
}, { immediate: true })

const ringClass   = computed(() => props.kind === 'expense' ? 'ring-primary/20 border-primary/50' : 'ring-income/20 border-green-300')
const focusClass  = computed(() => props.kind === 'expense' ? 'focus:ring-primary/100' : 'focus:ring-income/100')
const activeClass = computed(() => props.kind === 'expense' ? 'bg-primary text-white' : 'bg-income text-white')
const btnClass    = computed(() => props.kind === 'expense'
  ? 'bg-primary text-white hover:bg-primary/90 active:bg-primary/80'
  : 'bg-income text-white hover:bg-income/90 active:bg-green-800'
)

const isEditing = computed(() => props.editingItem !== null)

const paymentOptions: { value: PaymentType; label: string; icon: string }[] = [
  { value: 'cash',     label: 'Efectivo',      icon: 'lucide:banknote' },
  { value: 'transfer', label: 'Transferencia', icon: 'lucide:arrow-right-left' },
]

function resetForm() {
  amount.value      = ''
  reason.value      = ''
  description.value = ''
  paymentType.value = 'cash'
  errors.value      = {}
}

watch(
  () => props.editingItem,
  (item) => {
    if (item) {
      amount.value      = item.amount
      reason.value      = item.reason
      description.value = item.description ?? ''
      paymentType.value = item.paymentType
      accountId.value   = item.accountId
      errors.value      = {}
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

function validate(): boolean {
  errors.value = {}
  if (!amount.value || Number(amount.value) <= 0) errors.value.amount    = 'Requerido'
  if (!reason.value.trim())                        errors.value.reason    = 'Requerido'
  if (!accountId.value)                            errors.value.accountId = 'Requerido'
  return Object.keys(errors.value).length === 0
}

function handleSubmit() {
  if (props.disabled || !validate()) return
  emit('submit', {
    kind:        props.kind,
    amount:      Number(amount.value),
    reason:      reason.value.trim(),
    paymentType: paymentType.value,
    accountId:   Number(accountId.value),
    ...(description.value.trim() && { description: description.value.trim() }),
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
        <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          Razón / Motivo <span class="text-danger/60">*</span>
        </label>
        <input
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
      </div>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
        Descripción
      </label>
      <input
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

    <div class="flex flex-col sm:flex-row gap-4 sm:items-end">
      <div class="sm:w-56 shrink-0">
        <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          Método de pago
        </label>
        <AppTypeToggle
          v-model="paymentType"
          :options="paymentOptions"
          :disabled="disabled"
          :active-class="activeClass"
        />
      </div>

      <div class="flex-1">
        <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          Cuenta
        </label>
        <div class="relative">
          <Icon
            icon="lucide:wallet"
            class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
          />
          <select
            v-model="accountId"
            :disabled="disabled || filteredAccounts.length === 0"
            class="w-full pl-8 pr-8 py-2 rounded-lg border text-sm text-gray-900 appearance-none
                   focus:outline-none focus:ring-2 focus:border-transparent
                   disabled:bg-gray-50 disabled:text-gray-400 transition bg-white"
            :class="[focusClass, errors.accountId ? 'border-danger/60 bg-danger/10' : 'border-gray-300']"
          >
            <option v-if="filteredAccounts.length === 0" value="" disabled>
              Sin cuentas disponibles
            </option>
            <option
              v-for="account in filteredAccounts"
              :key="account.id"
              :value="account.id"
            >
              {{ account.name }}
            </option>
          </select>
          <Icon
            icon="lucide:chevron-down"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
          />
        </div>
        <p v-if="errors.accountId" class="mt-1 text-xs text-danger/80 leading-tight">{{ errors.accountId }}</p>
      </div>

      <div class="flex gap-2 shrink-0 pt-2 sm:pt-0">
        <button
          v-if="isEditing"
          @click="handleCancel"
          :disabled="disabled"
          class="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap
                 border border-gray-200 text-gray-500 hover:bg-gray-100
                 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          @click="handleSubmit"
          :disabled="disabled"
          class="flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap
                 disabled:opacity-60 disabled:cursor-not-allowed"
          :class="btnClass"
        >
          {{ disabled ? 'Guardando…' : isEditing ? 'Actualizar' : 'Guardar' }}
        </button>
      </div>
    </div>
  </div>
</template>