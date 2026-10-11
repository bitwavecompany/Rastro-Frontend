<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import { useEntitlementsStore } from '@/stores/useEntitlementsStore'
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
import RelocateMovementModal from '@/components/transactions/RelocateMovementModal.vue'
import RelocateRestoreWarningModal from '@/components/transactions/RelocateRestoreWarningModal.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppFormDialog from '@/components/ui/AppFormDialog.vue'
import type { Movement, MovementTab } from '@/composables/useAccountDetail'
import type { Account } from '@/types/account'
import type { Transaction } from '@/types/transaction'
import type { PaymentType } from '@/constants/transactions'

const route = useRoute()
const router = useRouter()

const accountsStore = useAccountsStore()
const transactionsStore = useTransactionsStore()
const entitlementsStore = useEntitlementsStore()
const toast = useToastStore()

// PRD Regla 10: Banner contextual si no hay cuentas destino disponibles para traslado
const relocateBanner = ref<{ text: string; buttonLabel: string; route: string } | null>(null)

const accountId = computed(() => route.params.id as string | number)

const {
  account,
  activeTab,
  hideDeactivated,
  deactivatedCount,
  totalExpenses,
  totalIncomes,
  balance,
  filteredMovements,
  restoreMovement,
  hardDeleteMovement,
  purgeAccountMovements,
} = useAccountDetail(accountId.value)

const accountForm = useAccountForm()
const movementForm = useMovementForm()

const deleteAccount = useDeleteConfirm<Account>()
const deleteMovement = useDeleteConfirm<Movement>()
const hardDeleteMovementConfirm = useDeleteConfirm<Movement>()
const isPurgeModalOpen = ref(false)

// Estado de traslado (Regla 7)
const relocatingItem = ref<Transaction | null>(null)
const isRelocateModalOpen = ref(false)

// Estado de advertencia al reactivar traslado (Regla 9)
const restoreWarningItem = ref<Transaction | null>(null)
const isRestoreWarningOpen = ref(false)

const tabs: { key: MovementTab; label: string }[] = [
  { key: 'all',      label: 'Todos' },
  { key: 'incomes',  label: 'Ingresos' },
  { key: 'expenses', label: 'Gastos' },
]

const paymentOptions: { value: PaymentType; label: string; icon: string }[] = [
  { value: 'cash',     label: 'Efectivo',      icon: 'lucide:banknote' },
  { value: 'transfer', label: 'Transferencia', icon: 'lucide:arrow-right-left' },
]

const isDefaultAccount = computed(() =>
  Boolean(account.value?.is_default || account.value?.id === accountsStore.defaultAccountId)
)

function goBack() {
  router.push({ name: 'accounts' })
}

function handleRequestRelocate(item: Transaction) {
  // PRD Regla 10: La condición de bloqueo es candidateAccounts.length === 0
  const originAccountId = String(item.account_id || item.accountId)
  const candidateAccounts = accountsStore.accounts.filter(
    a => !a.deletedAt && !a.deleted_at && String(a.id) !== originAccountId
  )

  if (candidateAccounts.length === 0) {
    if (entitlementsStore.isGuest) {
      relocateBanner.value = {
        text: 'Necesitas al menos una cuenta destino disponible para realizar traslados. Regístrate gratis para crear más cuentas.',
        buttonLabel: 'Regístrate gratis',
        route: '/register'
      }
    } else {
      relocateBanner.value = {
        text: 'Necesitas al menos una cuenta destino disponible para realizar traslados. Crea una nueva cuenta primero.',
        buttonLabel: 'Crear cuenta',
        route: '/accounts'
      }
    }
    return
  }

  relocateBanner.value = null
  relocatingItem.value = item
  isRelocateModalOpen.value = true
}

async function handleRelocateConfirm(payload: { destinationAccountId: string | number; reason: string }) {
  if (!relocatingItem.value) return
  try {
    await transactionsStore.relocate(relocatingItem.value.id, payload.destinationAccountId, payload.reason)
    toast.success('Movimiento trasladado exitosamente')
    isRelocateModalOpen.value = false
    relocatingItem.value = null
  } catch (err: any) {
    toast.error(err.message || 'Error al trasladar el movimiento')
  }
}

async function handleDeleteAccountConfirm() {
  if (!account.value) return
  try {
    await accountsStore.remove(account.value.id)
    toast.success('Cuenta desactivada exitosamente')
    router.replace({ name: 'accounts' })
  } catch (error: any) {
    toast.error(error.response?.data?.message || error.message || 'Error al desactivar la cuenta')
  } finally {
    deleteAccount.cancel()
  }
}

async function handleDeleteMovementConfirm(reason?: string) {
  if (!deleteMovement.target.value) return
  try {
    await transactionsStore.remove(deleteMovement.target.value.id, reason)
    toast.success('Movimiento desactivado')
  } catch (error: any) {
    toast.error(error.response?.data?.message || error.message || 'Error al desactivar el movimiento')
  } finally {
    deleteMovement.cancel()
  }
}

// PRD Regla 9: Advertencia al reactivar un registro trasladado
async function handleRestoreMovement(item: Transaction) {
  if (transactionsStore.isRelocated(item)) {
    restoreWarningItem.value = item
    isRestoreWarningOpen.value = true
    return
  }
  await executeRestoreMovement(item)
}

async function executeRestoreMovement(item: Transaction) {
  try {
    await restoreMovement(item.id)
    toast.success('Movimiento reactivado exitosamente')
  } catch (error: any) {
    toast.error(error.message || 'Error al reactivar el movimiento')
  } finally {
    isRestoreWarningOpen.value = false
    restoreWarningItem.value = null
  }
}

async function handleRestoreWarningConfirm() {
  if (restoreWarningItem.value) {
    await executeRestoreMovement(restoreWarningItem.value)
  }
}

function handleRequestHardDelete(item: Movement) {
  hardDeleteMovementConfirm.request(item)
}

async function handleHardDeleteConfirm() {
  if (!hardDeleteMovementConfirm.target.value) return
  try {
    await hardDeleteMovement(hardDeleteMovementConfirm.target.value.id)
    toast.success('Movimiento eliminado permanentemente')
  } catch (error: any) {
    toast.error(error.message || 'Error al eliminar permanentemente')
  } finally {
    hardDeleteMovementConfirm.cancel()
  }
}

async function handlePurgeAccountConfirm() {
  try {
    await purgeAccountMovements()
    toast.success('Todos los movimientos de la cuenta fueron eliminados permanentemente')
  } catch (error: any) {
    toast.error(error.message || 'Error al vaciar los movimientos')
  } finally {
    isPurgeModalOpen.value = false
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
          <span v-if="isDefaultAccount" class="ml-1 text-[10px] font-bold text-gray-600 bg-gray-100 px-1 py-0.5 rounded">Por defecto</span>
        </p>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <button
          v-if="!isDefaultAccount"
          @click="accountForm.open(account)"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200
                 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Icon icon="lucide:pencil" class="w-3.5 h-3.5" />
          Editar
        </button>
        <button
          v-if="!isDefaultAccount"
          @click="deleteAccount.request(account)"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-danger/20
                 text-xs font-medium text-danger/80 hover:bg-danger/10 transition-colors"
          title="Desactivar cuenta"
        >
          <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
          Desactivar
        </button>
        <button
          @click="isPurgeModalOpen = true"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200
                 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          title="Vaciar movimientos de esta cuenta"
        >
          <Icon icon="lucide:eraser" class="w-3.5 h-3.5" />
          Vaciar
        </button>
      </div>
    </div>

    <div class="px-6 py-6 space-y-5">
      <!-- PRD Regla 10: Banner contextual sin cuenta destino para traslado -->
      <div
        v-if="relocateBanner"
        class="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 animate-in fade-in duration-200"
      >
        <div class="flex items-start gap-2.5">
          <Icon icon="lucide:alert-circle" class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p class="text-xs sm:text-sm font-medium leading-relaxed">{{ relocateBanner.text }}</p>
        </div>
        <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            @click="router.push(relocateBanner.route)"
            class="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition"
          >
            {{ relocateBanner.buttonLabel }}
          </button>
          <button
            type="button"
            @click="relocateBanner = null"
            class="p-1 rounded-lg text-amber-600 hover:bg-amber-100 transition"
            title="Cerrar aviso"
          >
            <Icon icon="lucide:x" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p class="text-xs text-gray-400 font-medium mb-1">Saldo inicial</p>
          <p class="text-base font-bold text-gray-900">{{ formatAmount(Number(account.initial_balance ?? account.amount ?? 0)) }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-income/20 shadow-sm p-4">
          <p class="text-xs text-income font-medium mb-1">Ingresos</p>
          <p class="text-base font-bold text-income">+{{ formatAmount(totalIncomes) }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-danger/20 shadow-sm p-4">
          <p class="text-xs text-danger/80 font-medium mb-1">Gastos</p>
          <p class="text-base font-bold text-danger/80">-{{ formatAmount(totalExpenses) }}</p>
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
        <div class="flex items-center justify-between border-b border-gray-100 pr-4">
          <div class="flex flex-1">
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

          <!-- Toggle para ocultar/mostrar movimientos desactivados (visibles por defecto) -->
          <button
            v-if="deactivatedCount > 0"
            type="button"
            @click="hideDeactivated = !hideDeactivated"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition"
            :class="hideDeactivated ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'"
          >
            <Icon :icon="hideDeactivated ? 'lucide:eye' : 'lucide:eye-off'" class="w-3.5 h-3.5" />
            {{ hideDeactivated ? `Mostrar desactivados (${deactivatedCount})` : 'Ocultar desactivados' }}
          </button>
        </div>

        <div v-if="filteredMovements.length === 0" class="py-12 text-center">
          <Icon icon="lucide:inbox" class="w-9 h-9 text-gray-300 mx-auto mb-3" />
          <p class="text-sm font-medium text-gray-500">Sin movimientos</p>
          <p class="text-xs text-gray-400 mt-1">No hay registros para mostrar en esta vista.</p>
        </div>

        <template v-else>
          <div class="divide-y divide-gray-50 md:hidden">
            <MovementRow
              v-for="movement in filteredMovements"
              :key="`${movement.kind || movement.type}-${movement.id}`"
              :item="movement"
              @edit="movementForm.open($event)"
              @relocate="handleRequestRelocate"
              @delete="deleteMovement.request($event as Movement)"
              @restore="handleRestoreMovement"
              @hard-delete="handleRequestHardDelete($event as Movement)"
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
                  :key="`${movement.kind || movement.type}-${movement.id}`"
                  :item="movement"
                  @edit="movementForm.open($event)"
                  @relocate="handleRequestRelocate"
                  @delete="deleteMovement.request($event as Movement)"
                  @restore="handleRestoreMovement"
                  @hard-delete="handleRequestHardDelete($event as Movement)"
                />
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>
  </div>

  <!-- Modal Editar Cuenta -->
  <AppFormDialog
    :open="accountForm.isOpen.value"
    title="Editar cuenta"
    @confirm="accountForm.submit(account?.id)"
    @cancel="accountForm.close()"
    @update:open="val => !val && accountForm.close()"
  >
    <AccountFormFields
      :form="accountForm.form"
      :errors="accountForm.errors"
      :is-default-account="isDefaultAccount"
      :has-movements="accountForm.hasMovements.value"
    />
  </AppFormDialog>

  <!-- Modal Confirmación Cascada Cambio de Tipo (PRD Regla 5) -->
  <AppModal
    v-model:open="accountForm.isCascadeConfirmOpen.value"
    title="Cambiar tipo de cuenta"
    description="Cambiar el tipo de esta cuenta actualizará el método de pago de todos sus movimientos. Esta acción no se puede deshacer."
    confirm-label="Confirmar cambio"
    cancel-label="Cancelar"
    variant="danger"
    @confirm="accountForm.confirmCascade"
    @cancel="accountForm.cancelCascade"
  />

  <!-- Modal Editar Movimiento -->
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
        :disabled="true"
      />
      <p class="mt-1 text-[11px] text-gray-400">
        El método de pago corresponde al tipo de esta cuenta ({{ account?.type === 'cash' ? 'Efectivo' : 'Banco' }}).
      </p>
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

  <!-- Modal Desactivar Cuenta -->
  <AppModal
    v-model:open="deleteAccount.isOpen.value"
    title="Desactivar cuenta"
    :description="`¿Deseas desactivar '${deleteAccount.target.value?.name}'? Sus movimientos asociados también quedarán desactivados.`"
    confirm-label="Desactivar"
    cancel-label="Cancelar"
    variant="danger"
    @confirm="handleDeleteAccountConfirm"
    @cancel="deleteAccount.cancel"
  />

  <!-- Modal Desactivar Movimiento (Soft Delete) -->
  <AppModal
    v-model:open="deleteMovement.isOpen.value"
    title="Desactivar movimiento"
    :description="deleteMovement.target.value ? `¿Deseas desactivar '${deleteMovement.target.value.reason}'? Quedará excluido del saldo y podrás reactivarlo.` : undefined"
    confirm-label="Desactivar"
    cancel-label="Cancelar"
    variant="danger"
    :require-reason="true"
    reason-label="¿Por qué desactivas este movimiento?"
    reason-placeholder="Ej: duplicado, corrección..."
    @confirm="handleDeleteMovementConfirm"
    @cancel="deleteMovement.cancel"
  />

  <!-- Modal Eliminar Permanentemente Movimiento (Hard Delete - PRD 6.2) -->
  <AppModal
    v-model:open="hardDeleteMovementConfirm.isOpen.value"
    title="Eliminar permanentemente"
    description="Esta acción es permanente y no se puede deshacer. El registro será eliminado de la base de datos."
    confirm-label="Eliminar permanentemente"
    cancel-label="Cancelar"
    variant="danger"
    @confirm="handleHardDeleteConfirm"
    @cancel="hardDeleteMovementConfirm.cancel"
  />

  <!-- Modal Trasladar Movimiento (PRD Regla 7) -->
  <RelocateMovementModal
    v-model:open="isRelocateModalOpen"
    :transaction="relocatingItem"
    @confirm="handleRelocateConfirm"
  />

  <!-- Modal Advertencia Reactivación de Traslado (PRD Regla 9) -->
  <RelocateRestoreWarningModal
    v-model:open="isRestoreWarningOpen"
    :transaction="restoreWarningItem"
    @confirm="handleRestoreWarningConfirm"
    @cancel="() => { isRestoreWarningOpen = false; restoreWarningItem = null }"
  />

  <!-- Modal Vaciar Movimientos de Cuenta (Purge - PRD 6.2) -->
  <AppModal
    v-model:open="isPurgeModalOpen"
    title="Vaciar movimientos de la cuenta"
    description="¿Estás seguro de que deseas eliminar permanentemente todos los movimientos de esta cuenta? Esta acción no se puede deshacer y la cuenta conservará su saldo inicial."
    confirm-label="Vaciar movimientos"
    cancel-label="Cancelar"
    variant="danger"
    @confirm="handlePurgeAccountConfirm"
    @cancel="isPurgeModalOpen = false"
  />
</template>