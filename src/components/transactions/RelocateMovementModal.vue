<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useEntitlementsStore } from '@/stores/useEntitlementsStore'
import { formatAmount, formatDate } from '@/utils/formatters'
import AppModal from '@/components/ui/AppModal.vue'
import type { Transaction } from '@/types/transaction'
import type { PaymentType } from '@/constants/transactions'

const props = defineProps<{
  open: boolean
  transaction: Transaction | null
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  confirm: [payload: { destinationAccountId: string | number; reason: string }]
}>()

const router = useRouter()
const accountsStore = useAccountsStore()
const entitlements = useEntitlementsStore()

const paymentType = ref<PaymentType>('cash')
const destinationAccountId = ref<string | number>('')
const reason = ref('')
const error = ref<string | null>(null)

// Cuenta origen
const originAccount = computed(() => {
  if (!props.transaction) return null
  const accId = props.transaction.account_id || props.transaction.accountId
  return accountsStore._rawAccounts.find(a => String(a.id) === String(accId)) ?? null
})

// Cuentas distintas a la de origen
const otherAccounts = computed(() => {
  if (!props.transaction) return []
  const accId = props.transaction.account_id || props.transaction.accountId
  return accountsStore.accounts.filter(a => String(a.id) !== String(accId))
})

// Regla 1: El método de pago filtra las cuentas destino disponibles
const targetAccountType = computed(() => paymentType.value === 'cash' ? 'cash' : 'bank')
const availableDestinationAccounts = computed(() => {
  return otherAccounts.value.filter(a => a.type === targetAccountType.value)
})

// Cuenta destino seleccionada
const selectedDestinationAccount = computed(() => {
  return availableDestinationAccounts.value.find(a => String(a.id) === String(destinationAccountId.value)) ?? null
})

// Inicializar selección al abrir o cambiar de método
watch(
  () => [props.open, props.transaction] as const,
  ([isOpen, tx]) => {
    if (isOpen && tx) {
      reason.value = ''
      error.value = null
      // Sugerir el método opuesto o el que tenga cuentas disponibles
      const currentMethod = tx.payment_method || tx.paymentType || 'cash'
      // Si hay cuentas en el método actual que no sean la de origen, conservarlo, sino cambiar
      const accountsSameType = otherAccounts.value.filter(
        a => a.type === (currentMethod === 'cash' ? 'cash' : 'bank')
      )
      if (accountsSameType.length > 0) {
        paymentType.value = currentMethod
        destinationAccountId.value = accountsSameType[0].id
      } else {
        const alternateMethod: PaymentType = currentMethod === 'cash' ? 'transfer' : 'cash'
        paymentType.value = alternateMethod
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
    const isValid = newAccounts.some(a => String(a.id) === String(destinationAccountId.value))
    if (!isValid) {
      destinationAccountId.value = newAccounts.length > 0 ? newAccounts[0].id : ''
    }
  }
)

// Regla 2: Mensaje de conversión contextual cuando no hay cuentas destino para ese método
const emptyDestinationMessage = computed(() => {
  if (otherAccounts.value.length === 0) {
    if (entitlements.isGuest) {
      return {
        text: 'Necesitas al menos dos cuentas para realizar traslados. Regístrate gratis para crear más cuentas.',
        actionLabel: 'Crear cuenta gratis',
        actionRoute: '/register'
      }
    } else {
      return {
        text: 'Necesitas al menos dos cuentas para realizar traslados. Crea una nueva cuenta primero.',
        actionLabel: 'Crear cuenta',
        actionRoute: '/accounts'
      }
    }
  }

  if (availableDestinationAccounts.value.length > 0) return null

  if (paymentType.value === 'transfer') {
    if (entitlements.isGuest) {
      return {
        text: 'Necesitas una cuenta bancaria para registrar transferencias. Regístrate gratis para crearla.',
        actionLabel: 'Crear cuenta gratis',
        actionRoute: '/register'
      }
    } else {
      return {
        text: 'Crea una cuenta de tipo banco para registrar transferencias.',
        actionLabel: 'Crear cuenta bancaria',
        actionRoute: '/accounts'
      }
    }
  } else {
    return {
      text: 'No tienes otras cuentas de efectivo activas disponibles para este método de pago.',
      actionLabel: null,
      actionRoute: null
    }
  }
})

function handleNavigate(route: string) {
  emit('update:open', false)
  router.push(route)
}

function handleConfirm() {
  if (!destinationAccountId.value) {
    error.value = 'Debes seleccionar una cuenta destino válida.'
    return
  }
  if (!reason.value.trim()) {
    error.value = 'El motivo del traslado es obligatorio.'
    return
  }
  error.value = null
  emit('confirm', {
    destinationAccountId: destinationAccountId.value,
    reason: reason.value.trim()
  })
}
</script>

<template>
  <AppModal
    :open="open"
    title="Trasladar movimiento"
    confirm-label="Confirmar traslado"
    cancel-label="Cancelar"
    variant="warning"
    :confirm-disabled="!destinationAccountId || !reason.trim() || otherAccounts.length === 0"
    @confirm="handleConfirm"
    @cancel="emit('update:open', false)"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div v-if="transaction" class="space-y-4 px-6 pb-4">

        <!-- Resumen del movimiento origen -->
        <div class="bg-gray-50 border border-gray-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3 text-sm">
          <div class="min-w-0">
            <p class="font-bold text-gray-900 truncate">{{ transaction.reason }}</p>
            <p class="text-xs text-gray-500 mt-0.5">
              Origen: <span class="font-semibold text-gray-700">{{ originAccount?.name ?? 'Desconocida' }}</span> ({{ originAccount?.type === 'cash' ? 'Efectivo' : 'Banco' }})
              &middot; {{ formatDate(transaction.date || transaction.createdAt) }}
            </p>
          </div>
          <p
            class="text-base font-bold shrink-0"
            :class="(transaction.kind === 'income' || transaction.type === 'income') ? 'text-income' : 'text-danger/80'"
          >
            {{ (transaction.kind === 'income' || transaction.type === 'income') ? '+' : '-' }}{{ formatAmount(transaction.amount) }}
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
                @click="paymentType = 'cash'"
                class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition"
                :class="paymentType === 'cash' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'"
              >
                <Icon icon="lucide:banknote" class="w-4 h-4" />
                Efectivo
              </button>
              <button
                type="button"
                @click="paymentType = 'transfer'"
                class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition"
                :class="paymentType === 'transfer' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'"
              >
                <Icon icon="lucide:arrow-right-left" class="w-4 h-4" />
                Transferencia
              </button>
            </div>
          </div>

          <!-- Selector de Cuenta Destino -->
          <div v-if="availableDestinationAccounts.length > 0">
            <label for="destinationAccountSelect" class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Cuenta destino
            </label>
            <select
              id="destinationAccountSelect"
              v-model="destinationAccountId"
              class="w-full text-sm rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            >
              <option
                v-for="acc in availableDestinationAccounts"
                :key="acc.id"
                :value="acc.id"
              >
                {{ acc.name }} ({{ acc.type === 'cash' ? 'Efectivo' : 'Banco' }})
              </option>
            </select>
          </div>

          <!-- Resumen de traslado requerido por PRD Regla 7 -->
          <div
            v-if="selectedDestinationAccount && originAccount"
            class="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900"
          >
            <p class="font-semibold flex items-center gap-1.5">
              <Icon icon="lucide:info" class="w-4 h-4 text-blue-600 shrink-0" />
              Resumen del traslado:
            </p>
            <p class="mt-1 text-blue-800">
              Se trasladará de <strong>{{ originAccount.name }}</strong> ({{ originAccount.type === 'cash' ? 'Efectivo' : 'Banco' }})
              a <strong>{{ selectedDestinationAccount.name }}</strong> ({{ selectedDestinationAccount.type === 'cash' ? 'Efectivo' : 'Banco' }}).
            </p>
          </div>

          <!-- Motivo del traslado (Obligatorio) -->
          <div>
            <label for="relocateReasonInput" class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Motivo del traslado <span class="text-danger">*</span>
            </label>
            <input
              id="relocateReasonInput"
              type="text"
              v-model="reason"
              placeholder="Ej: registrado por error en cuenta equivocada..."
              class="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              :class="{ 'border-danger focus:ring-danger/20': error }"
            />
            <p v-if="error" class="text-xs text-danger mt-1 font-medium">{{ error }}</p>
          </div>
        </template>

      </div>
    </template>
  </AppModal>
</template>
