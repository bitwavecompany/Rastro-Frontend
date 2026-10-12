<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useEntitlementsStore } from '@/stores/useEntitlementsStore'
import { formatAmount, formatDate } from '@/utils/formatters'
import AppModal from '@/components/ui/AppModal.vue'
import type { Transaction } from '@/types/transaction'
import type { PaymentMethod } from '@/constants/transactions'

const props = defineProps<{
  open: boolean
  transaction: Transaction | null
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  confirm: [payload: { destinationAccountId: string; reason: string }]
}>()

const router = useRouter()
const accountsStore = useAccountsStore()
const entitlements = useEntitlementsStore()

const payment_method = ref<PaymentMethod>('cash')
const destinationAccountId = ref<string>('')
const reason = ref('')
const error = ref<string | null>(null)

// Origin account
const originAccount = computed(() => {
  if (!props.transaction) return null
  const accId = props.transaction.account_id
  return accountsStore.getAccountById(accId) ?? null
})

// Accounts other than origin
const otherAccounts = computed(() => {
  if (!props.transaction) return []
  const accId = props.transaction.account_id
  return accountsStore.accounts.filter(a => a.id !== accId)
})

// Rule 1: Payment method filters available destination accounts
const targetAccountType = computed(() => payment_method.value === 'cash' ? 'cash' : 'bank')
const availableDestinationAccounts = computed(() => {
  return otherAccounts.value.filter(a => a.type === targetAccountType.value)
})

// Selected destination account
const selectedDestinationAccount = computed(() => {
  return availableDestinationAccounts.value.find(a => a.id === destinationAccountId.value) ?? null
})

// Initialize selection on open or method change
watch(
  () => [props.open, props.transaction] as const,
  ([isOpen, tx]) => {
    if (isOpen && tx) {
      reason.value = ''
      error.value = null
      const currentMethod = tx.payment_method || 'cash'
      const accountsSameType = otherAccounts.value.filter(
        a => a.type === (currentMethod === 'cash' ? 'cash' : 'bank')
      )
      if (accountsSameType.length > 0) {
        payment_method.value = currentMethod
        destinationAccountId.value = accountsSameType[0].id
      } else {
        const alternateMethod: PaymentMethod = currentMethod === 'cash' ? 'transfer' : 'cash'
        payment_method.value = alternateMethod
        const accountsAlt = otherAccounts.value.filter(
          a => a.type === (alternateMethod === 'cash' ? 'cash' : 'bank')
        )
        destinationAccountId.value = accountsAlt.length > 0 ? accountsAlt[0].id : ''
      }
    }
  },
  { immediate: true }
)

watch(
  availableDestinationAccounts,
  (newAccounts) => {
    const isValid = newAccounts.some(a => a.id === destinationAccountId.value)
    if (!isValid) {
      destinationAccountId.value = newAccounts.length > 0 ? newAccounts[0].id : ''
    }
  }
)

// Rule 2: Contextual CTA when destination accounts are empty
const emptyDestinationMessage = computed(() => {
  if (otherAccounts.value.length === 0) {
    if (entitlements.isGuest) {
      return {
        text: 'Necesitas al menos dos cuentas para realizar traslados. Regístrate gratis para crear más cuentas.',
        actionLabel: 'Crear cuenta gratis',
        actionRoute: '/register',
      }
    } else {
      return {
        text: 'Necesitas al menos dos cuentas para realizar traslados. Crea una nueva cuenta primero.',
        actionLabel: 'Crear cuenta',
        actionRoute: '/accounts',
      }
    }
  }

  if (availableDestinationAccounts.value.length === 0) {
    if (payment_method.value === 'transfer') {
      if (entitlements.isGuest) {
        return {
          text: 'No tienes cuentas bancarias para recibir transferencias. Regístrate gratis para crear cuentas bancarias.',
          actionLabel: 'Crear cuenta gratis',
          actionRoute: '/register',
        }
      } else {
        return {
          text: 'No tienes cuentas bancarias activas disponibles para recibir transferencias.',
          actionLabel: 'Crear cuenta bancaria',
          actionRoute: '/accounts',
        }
      }
    } else {
      return {
        text: 'No tienes otras cuentas de efectivo activas disponibles como destino.',
        actionLabel: null,
        actionRoute: null,
      }
    }
  }

  return null
})

function handleNavigate(route: string) {
  emit('update:open', false)
  router.push(route)
}

function handleConfirm() {
  error.value = null

  if (!destinationAccountId.value) {
    error.value = 'Debes seleccionar una cuenta destino.'
    return
  }

  if (originAccount.value && destinationAccountId.value === originAccount.value.id) {
    error.value = 'La cuenta destino no puede ser la misma cuenta de origen.'
    return
  }

  if (!reason.value.trim()) {
    error.value = 'El motivo del traslado es obligatorio (PRD Regla 7).'
    return
  }

  emit('confirm', {
    destinationAccountId: destinationAccountId.value,
    reason: reason.value.trim(),
  })
}
</script>

<template>
  <AppModal
    :open="open"
    title="Trasladar movimiento a otra cuenta"
    confirm-label="Confirmar traslado"
    cancel-label="Cancelar"
    :confirm-disabled="!destinationAccountId || !reason.trim() || availableDestinationAccounts.length === 0"
    variant="default"
    @update:open="emit('update:open', $event)"
    @confirm="handleConfirm"
  >
    <template #body>
      <div v-if="transaction" class="space-y-4">
        <!-- Resumen del Movimiento Actual -->
        <div class="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs text-gray-400 font-medium uppercase tracking-wider">Movimiento a trasladar</p>
            <p class="text-sm font-bold text-gray-900 truncate mt-0.5">{{ transaction.reason }}</p>
            <p class="text-xs text-gray-500 mt-0.5 truncate">
              <span class="font-semibold text-gray-700">{{ originAccount?.name ?? 'Desconocida' }}</span>
              &middot; {{ formatDate(transaction.date || transaction.created_at) }}
            </p>
          </div>
          <p
            class="text-base font-bold shrink-0"
            :class="transaction.type === 'income' ? 'text-income' : 'text-danger/80'"
          >
            {{ transaction.type === 'income' ? '+' : '-' }}{{ formatAmount(transaction.amount) }}
          </p>
        </div>

        <!-- Banner si solo tiene una cuenta o no hay disponibles (Regla 2) -->
        <div
          v-if="emptyDestinationMessage"
          class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-2"
        >
          <div class="flex items-start gap-2">
            <Icon icon="lucide:alert-circle" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p class="font-medium leading-relaxed">{{ emptyDestinationMessage.text }}</p>
          </div>
          <button
            v-if="emptyDestinationMessage.actionLabel && emptyDestinationMessage.actionRoute"
            type="button"
            @click="handleNavigate(emptyDestinationMessage.actionRoute)"
            class="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition"
          >
            {{ emptyDestinationMessage.actionLabel }}
          </button>
        </div>

        <template v-if="otherAccounts.length > 0">
          <!-- Selector de Método de Pago Destino (Regla 1) -->
          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Método de pago destino
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="payment_method = 'cash'"
                class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition"
                :class="payment_method === 'cash' ? 'bg-primary text-white border-primary shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'"
              >
                <Icon icon="lucide:banknote" class="w-4 h-4" />
                Efectivo
              </button>
              <button
                type="button"
                @click="payment_method = 'transfer'"
                class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition"
                :class="payment_method === 'transfer' ? 'bg-primary text-white border-primary shadow-xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'"
              >
                <Icon icon="lucide:arrow-right-left" class="w-4 h-4" />
                Transferencia
              </button>
            </div>
          </div>

          <!-- Selector de Cuenta Destino -->
          <div>
            <label for="relocate-destination-account" class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Cuenta destino <span class="text-danger/60">*</span>
            </label>
            <div class="relative">
              <Icon
                icon="lucide:building-2"
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              />
              <select
                id="relocate-destination-account"
                v-model="destinationAccountId"
                :disabled="availableDestinationAccounts.length === 0"
                class="w-full pl-9 pr-8 py-2.5 rounded-xl border text-sm text-gray-900 appearance-none bg-white transition focus:outline-none focus:ring-2 focus:ring-primary/100 disabled:bg-gray-50 disabled:text-gray-400"
                :class="availableDestinationAccounts.length === 0 ? 'border-gray-200' : 'border-gray-300'"
              >
                <option v-if="availableDestinationAccounts.length === 0" value="" disabled>
                  Sin cuentas disponibles para este método
                </option>
                <option
                  v-for="account in availableDestinationAccounts"
                  :key="account.id"
                  :value="account.id"
                >
                  {{ account.name }} ({{ account.type === 'cash' ? 'Efectivo' : 'Banco' }})
                </option>
              </select>
              <Icon
                icon="lucide:chevron-down"
                class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              />
            </div>
          </div>

          <!-- Motivo del traslado (Obligatorio PRD Regla 7) -->
          <div>
            <label for="relocate-reason" class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Motivo del traslado <span class="text-danger/60">*</span>
            </label>
            <input
              id="relocate-reason"
              v-model="reason"
              type="text"
              placeholder="Ej: Registrado por error en efectivo..."
              class="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/100 transition"
              @keyup.enter="handleConfirm"
            />
            <p class="text-[11px] text-gray-400 mt-1">
              Quedará registrado como nota de auditoría en la cuenta origen.
            </p>
          </div>

          <!-- Alerta informativa (PRD Regla 7) -->
          <div class="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 space-y-1">
            <div class="flex items-start gap-1.5 font-semibold text-blue-950">
              <Icon icon="lucide:info" class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>Efecto del traslado:</span>
            </div>
            <ul class="list-disc list-inside text-blue-800/90 space-y-0.5 pl-1 leading-relaxed">
              <li>El movimiento original se desactivará en <strong>{{ originAccount?.name }}</strong>.</li>
              <li>Se creará una copia activa en <strong>{{ selectedDestinationAccount?.name || 'la cuenta destino' }}</strong> conservando la fecha original ({{ formatDate(transaction.date || transaction.created_at) }}).</li>
            </ul>
          </div>

          <!-- Mensaje de error si falla la validación -->
          <p v-if="error" class="text-xs text-danger/80 font-medium bg-danger/10 p-2.5 rounded-lg">
            {{ error }}
          </p>
        </template>
      </div>
    </template>
  </AppModal>
</template>
