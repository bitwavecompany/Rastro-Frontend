<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import { useToastStore } from '@/stores/useToastStore'
import { useAccountDetail } from '@/composables/useAccountDetail'
import { useAccountForm } from '@/composables/useAccountForm'
import { useMovementForm } from '@/composables/useMovementForm'
import { useDeleteConfirm } from '@/composables/useDeleteConfirm'
import { formatAmount } from '@/utils/formatters'
import AccountFormFields from '@/components/accounts/AccountFormFields.vue'
import AppAmountInput from '@/components/ui/AppAmountInput.vue'
import AppTypeToggle from '@/components/ui/AppTypeToggle.vue'
import MovementRow from '@/components/transactions/MovementRow.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppFormDialog from '@/components/ui/AppFormDialog.vue'
import type { Movement, MovementTab } from '@/composables/useAccountDetail'
import type { Account } from '@/types/account'
import type { PaymentType } from '@/types/transaction'

const route = useRoute()
const router = useRouter()

const accountsStore = useAccountsStore()
const transactionsStore = useTransactionsStore()
const toast = useToastStore()

const accountId = computed(() => Number(route.params.id))

const {
  account,
  activeTab,
  accountExpenses,
  accountIncomes,
  totalExpenses,
  totalIncomes,
  balance,
  filteredMovements,
} = useAccountDetail(accountId.value)

const accountForm = useAccountForm()
const movementForm = useMovementForm()

const deleteAccount  = useDeleteConfirm<Account>()
const deleteMovement = useDeleteConfirm<Movement>()

const tabs: { key: MovementTab; label: string }[] = [
  { key: 'all',      label: 'Todos' },
  { key: 'incomes',  label: 'Ingresos' },
  { key: 'expenses', label: 'Gastos' },
]

const paymentOptions: { value: PaymentType; label: string; icon: string }[] = [
  { value: 'cash',     label: 'Efectivo',      icon: 'lucide:banknote' },
  { value: 'transfer', label: 'Transferencia', icon: 'lucide:arrow-right-left' },
]

function goBack() {
  router.push({ name: 'accounts' })
}

async function handleDeleteAccountConfirm() {
  if (!account.value) return
  try {
    await accountsStore.remove(account.value.id)
    toast.success('Cuenta eliminada')
    router.replace({ name: 'accounts' })
  } catch {
    toast.error('Error al eliminar la cuenta')
  } finally {
    deleteAccount.cancel()
  }
}

async function handleDeleteMovementConfirm(reason?: string) {
  if (!deleteMovement.target.value) return
  try {
    await transactionsStore.remove(deleteMovement.target.value.id, reason)
    toast.success('Registro eliminado')
  } catch {
    toast.error('Error al eliminar el registro')
  } finally {
    deleteMovement.cancel()
  }
}
</script>

<template>
  <div v-if="!account" class="min-h-full bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <Icon icon="lucide:wallet" class="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p class="text-sm font-medium text-gray-500">Cuenta no encontrada</p>
      <button @click="goBack" class="mt-4 text-xs text-primary hover:underline">
        Volver a cuentas
      </button>
    </div>
  </div>

  <div v-else class="min-h-full bg-gray-50">
    <div class="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
      <button
        @click="goBack"
        class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400
               hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0"
      >
        <Icon icon="lucide:arrow-left" class="w-4 h-4" />
      </button>
      <div class="flex-1 min-w-0">
        <h1 class="text-base font-bold text-gray-900 truncate">{{ account.name }}</h1>
        <p class="text-xs text-gray-400">
          {{ account.type === 'cash' ? 'Efectivo' : 'Banco' }}
          <span v-if="account.description"> · {{ account.description }}</span>
        </p>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <button
          @click="accountForm.open(account)"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200
                 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Icon icon="lucide:pencil" class="w-3.5 h-3.5" />
          Editar
        </button>
        <button
          v-if="account.id !== 1"
          @click="deleteAccount.request(account)"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-danger/20
                 text-xs font-medium text-danger/80 hover:bg-danger/10 transition-colors"
        >
          <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
          Eliminar
        </button>
      </div>
    </div>

    <div class="px-6 py-6 space-y-5">
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p class="text-xs text-gray-400 font-medium mb-1">Saldo inicial</p>
          <p class="text-base font-bold text-gray-900">{{ formatAmount(account.amount) }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-income/20 shadow-sm p-4">
          <p class="text-xs text-income font-medium mb-1">Ingresos</p>
          <p class="text-base font-bold text-income">+{{ formatAmount(totalIncomes) }}</p>
          <p class="text-xs text-gray-400 mt-0.5">
            {{ accountIncomes.length }} registro{{ accountIncomes.length !== 1 ? 's' : '' }}
          </p>
        </div>
        <div class="bg-white rounded-2xl border border-danger/20 shadow-sm p-4">
          <p class="text-xs text-danger/80 font-medium mb-1">Gastos</p>
          <p class="text-base font-bold text-danger/80">-{{ formatAmount(totalExpenses) }}</p>
          <p class="text-xs text-gray-400 mt-0.5">
            {{ accountExpenses.length }} registro{{ accountExpenses.length !== 1 ? 's' : '' }}
          </p>
        </div>
      </div>

      <div
        class="bg-white rounded-2xl border shadow-sm px-5 py-4 flex items-center justify-between"
        :class="balance >= 0 ? 'border-gray-200' : 'border-danger/30'"
      >
        <div class="flex items-center gap-2">
          <Icon icon="lucide:scale" class="w-4 h-4 text-gray-400" />
          <span class="text-sm font-medium text-gray-600">Balance actual</span>
        </div>
        <span class="text-lg font-bold" :class="balance >= 0 ? 'text-gray-900' : 'text-danger/80'">
          {{ formatAmount(balance) }}
        </span>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="flex border-b border-gray-100">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            class="flex-1 py-3 text-xs font-semibold transition-colors"
            :class="activeTab === tab.key
              ? 'text-gray-900 border-b-2 border-gray-900 -mb-px'
              : 'text-gray-400 hover:text-gray-600'"
          >
            {{ tab.label }}
          </button>
        </div>

        <div v-if="filteredMovements.length === 0" class="py-12 text-center">
          <Icon icon="lucide:inbox" class="w-9 h-9 text-gray-300 mx-auto mb-3" />
          <p class="text-sm font-medium text-gray-500">Sin movimientos</p>
          <p class="text-xs text-gray-400 mt-1">No hay registros en esta categoría.</p>
        </div>

        <template v-else>
          <div class="divide-y divide-gray-50 md:hidden">
            <MovementRow
              v-for="movement in filteredMovements"
              :key="`${movement.kind}-${movement.id}`"
              :item="movement"
              @edit="movementForm.open($event)"
              @delete="deleteMovement.request($event as Movement)"
            />
          </div>

          <div class="hidden md:block overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100">
                  <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12"></th>
                  <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Razón</th>
                  <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
                  <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Fecha</th>
                  <th class="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Monto</th>
                  <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <MovementRow
                  v-for="movement in filteredMovements"
                  :key="`${movement.kind}-${movement.id}`"
                  :item="movement"
                  @edit="movementForm.open($event)"
                  @delete="deleteMovement.request($event as Movement)"
                />
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>
  </div>

  <AppFormDialog
    :open="accountForm.isOpen.value"
    title="Editar cuenta"
    @confirm="accountForm.submit(account?.id)"
    @cancel="accountForm.close()"
    @update:open="val => !val && accountForm.close()"
  >
    <AccountFormFields :form="accountForm.form" :errors="accountForm.errors" :is-default-account="account?.id === 1" />
  </AppFormDialog>

  <AppFormDialog
    :open="movementForm.isOpen.value"
    :title="movementForm.editingKind() === 'income' ? 'Editar ingreso' : 'Editar gasto'"
    @confirm="movementForm.submit()"
    @cancel="movementForm.close()"
    @update:open="val => !val && movementForm.close()"
  >
    <div>
      <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
        Monto <span class="text-danger/60">*</span>
      </label>
      <AppAmountInput
        v-model="movementForm.form.amount"
        :error="movementForm.errors.amount"
      />
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
        Razón <span class="text-danger/60">*</span>
      </label>
      <input
        v-model="movementForm.form.reason"
        type="text"
        placeholder="Razón"
        class="w-full px-3 py-2 rounded-lg border text-sm text-gray-900 placeholder-gray-400
               focus:outline-none focus:ring-2 focus:ring-primary/100 focus:border-transparent transition"
        :class="movementForm.errors.reason ? 'border-danger/60 bg-danger/10' : 'border-gray-300'"
      />
      <p v-if="movementForm.errors.reason" class="mt-1 text-xs text-danger/80">{{ movementForm.errors.reason }}</p>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Tipo de pago</label>
      <AppTypeToggle
        v-model="movementForm.form.paymentType"
        :options="paymentOptions"
      />
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Descripción</label>
      <input
        v-model="movementForm.form.description"
        type="text"
        placeholder="Opcional"
        class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900
               placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/100
               focus:border-transparent transition"
      />
    </div>
  </AppFormDialog>

  <AppModal
    v-model:open="deleteAccount.isOpen.value"
    title="Eliminar cuenta"
    :description="`¿Deseas eliminar '${deleteAccount.target.value?.name}'? Esta acción no se puede deshacer.`"
    confirm-label="Eliminar"
    cancel-label="Cancelar"
    variant="danger"
    @confirm="handleDeleteAccountConfirm"
    @cancel="deleteAccount.cancel"
  />

  <AppModal
    v-model:open="deleteMovement.isOpen.value"
    title="Eliminar registro"
    :description="deleteMovement.target.value ? `¿Deseas eliminar '${deleteMovement.target.value.reason}'?` : undefined"
    confirm-label="Eliminar"
    cancel-label="Cancelar"
    variant="danger"
    :require-reason="true"
    reason-label="¿Por qué eliminas este registro?"
    reason-placeholder="Ej: duplicado, error de cálculo..."
    @confirm="handleDeleteMovementConfirm"
    @cancel="deleteMovement.cancel"
  />
</template>