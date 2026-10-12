<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useEntitlementsStore } from '@/stores/useEntitlementsStore'
import { useToastStore } from '@/stores/useToastStore'
import { useDeleteConfirm } from '@/composables/useDeleteConfirm'
import TransactionForm from '@/components/transactions/TransactionForm.vue'
import TransactionList from '@/components/transactions/TransactionList.vue'
import RelocateMovementModal from '@/components/transactions/RelocateMovementModal.vue'
import RelocateRestoreWarningModal from '@/components/transactions/RelocateRestoreWarningModal.vue'
import AppModal from '@/components/ui/AppModal.vue'
import type { Transaction, CreateTransactionPayload } from '@/types/transaction'
import type { TransactionType } from '@/constants/transactions'

const props = defineProps<{
  type: TransactionType
}>()

const router = useRouter()
const store = useTransactionsStore()
const accountsStore = useAccountsStore()
const entitlementsStore = useEntitlementsStore()
const toast = useToastStore()

// PRD Rule 10: Contextual banner if no destination accounts are available for relocation
const relocateBanner = ref<{ text: string; buttonLabel: string; route: string } | null>(null)

// Deactivated records are visible by default
const hideDeactivated = ref(false)

const allItems = computed(() =>
  props.type === 'expense' ? store.allExpenses : store.allIncomes
)

// PRD 2.2 & 4.3: Transactions are unlimited across all plans
const items = computed(() =>
  hideDeactivated.value
    ? allItems.value.filter(t => !t.deleted_at)
    : allItems.value
)

const deactivatedCount = computed(() =>
  allItems.value.filter(t => !!t.deleted_at).length
)

const pageTitle = computed(() =>
  props.type === 'expense' ? 'Gastos' : 'Ingresos'
)

const pageSubtitle = computed(() =>
  props.type === 'expense'
    ? 'Registra y controla tus gastos'
    : 'Registra y controla tus ingresos'
)

const deleteModalTitle = computed(() =>
  props.type === 'expense' ? 'Desactivar gasto' : 'Desactivar ingreso'
)

const deleteReasonLabel = computed(() =>
  props.type === 'expense'
    ? '¿Por qué desactivas este gasto?'
    : '¿Por qué desactivas este ingreso?'
)

const editingItem = ref<Transaction | null>(null)
const formRef = ref<HTMLElement | null>(null)
const isSubmitting = ref(false)
const error = ref<string | null>(null)

const deleteConfirm = useDeleteConfirm<Transaction>()
const hardDeleteConfirm = useDeleteConfirm<Transaction>()

// Relocation state (Rule 7)
const relocatingItem = ref<Transaction | null>(null)
const isRelocateModalOpen = ref(false)

// Warning state when restoring relocated record (Rule 9)
const restoreWarningItem = ref<Transaction | null>(null)
const isRestoreWarningOpen = ref(false)

async function handleSubmit(payload: CreateTransactionPayload) {
  isSubmitting.value = true
  error.value = null

  try {
    if (editingItem.value) {
      await store.update(editingItem.value.id, payload)
      toast.success(props.type === 'expense' ? 'Gasto actualizado' : 'Ingreso actualizado')
      editingItem.value = null
    } else {
      await store.add(payload)
      toast.success(props.type === 'expense' ? 'Gasto registrado' : 'Ingreso registrado')
    }
  } catch (err: unknown) {
    const errorObj = err as { response?: { status?: number; data?: { errors?: Record<string, string[]>; message?: string } }; message?: string }
    if (errorObj.response?.status === 422 && errorObj.response.data?.errors) {
      const errs = errorObj.response.data.errors
      error.value = errs[Object.keys(errs)[0]][0]
    } else {
      error.value = errorObj.response?.data?.message || errorObj.message || 'Error al guardar el movimiento'
    }
    toast.error(error.value as string)
  } finally {
    isSubmitting.value = false
  }
}

function handleEdit(item: Transaction) {
  editingItem.value = item
  nextTick(() => {
    formRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function handleEditCancel() {
  editingItem.value = null
}

function handleRequestRelocate(item: Transaction) {
  // PRD Rule 10: Block if candidateAccounts.length === 0
  const originAccountId = item.account_id
  const candidateAccounts = accountsStore.accounts.filter(
    a => !a.deleted_at && a.id !== originAccountId
  )

  if (candidateAccounts.length === 0) {
    if (entitlementsStore.isGuest) {
      relocateBanner.value = {
        text: 'Necesitas al menos una cuenta destino disponible para realizar traslados. Regístrate gratis para crear más cuentas.',
        buttonLabel: 'Regístrate gratis',
        route: '/register',
      }
    } else {
      relocateBanner.value = {
        text: 'Necesitas al menos una cuenta destino disponible para realizar traslados. Crea una nueva cuenta primero.',
        buttonLabel: 'Crear cuenta',
        route: '/accounts',
      }
    }
    return
  }

  relocateBanner.value = null
  relocatingItem.value = item
  isRelocateModalOpen.value = true
}

async function handleRelocateConfirm(payload: { destinationAccountId: string; reason: string }) {
  if (!relocatingItem.value) return
  try {
    await store.relocate(relocatingItem.value.id, payload.destinationAccountId, payload.reason)
    toast.success(props.type === 'expense' ? 'Gasto trasladado exitosamente' : 'Ingreso trasladado exitosamente')
    isRelocateModalOpen.value = false
    relocatingItem.value = null
  } catch (err: unknown) {
    const errorObj = err as { message?: string }
    toast.error(errorObj.message || 'Error al trasladar el movimiento')
  }
}

async function handleDeleteConfirm(reason?: string) {
  if (!deleteConfirm.target.value) return
  if (editingItem.value?.id === deleteConfirm.target.value.id) editingItem.value = null
  try {
    await store.remove(deleteConfirm.target.value.id, reason)
    toast.success(props.type === 'expense' ? 'Gasto desactivado' : 'Ingreso desactivado')
  } catch (err: unknown) {
    const errorObj = err as { response?: { data?: { message?: string } }; message?: string }
    const msg = errorObj.response?.data?.message || errorObj.message || 'Error al desactivar el registro'
    toast.error(msg)
  } finally {
    deleteConfirm.cancel()
  }
}

// PRD Rule 9: Warning when reactivating a relocated transaction
async function handleRestore(item: Transaction) {
  if (store.isRelocated(item)) {
    restoreWarningItem.value = item
    isRestoreWarningOpen.value = true
    return
  }
  await executeRestore(item)
}

async function executeRestore(item: Transaction) {
  try {
    await store.restore(item.id)
    toast.success(props.type === 'expense' ? 'Gasto reactivado' : 'Ingreso reactivado')
  } catch (err: unknown) {
    const errorObj = err as { message?: string }
    toast.error(errorObj.message || 'Error al reactivar el registro')
  } finally {
    isRestoreWarningOpen.value = false
    restoreWarningItem.value = null
  }
}

async function handleRestoreWarningConfirm() {
  if (restoreWarningItem.value) {
    await executeRestore(restoreWarningItem.value)
  }
}

function handleRequestHardDelete(item: Transaction) {
  hardDeleteConfirm.request(item)
}

async function handleHardDeleteConfirm() {
  if (!hardDeleteConfirm.target.value) return
  try {
    await store.hardDelete(hardDeleteConfirm.target.value.id)
    toast.success('Movimiento eliminado permanentemente')
  } catch (err: unknown) {
    const errorObj = err as { message?: string }
    toast.error(errorObj.message || 'Error al eliminar el registro')
  } finally {
    hardDeleteConfirm.cancel()
  }
}
</script>

<template>
  <div class="min-h-full bg-gray-50 px-6 py-8">
    <div class="space-y-5">

      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">{{ pageTitle }}</h1>
        <p class="text-sm text-gray-400 mt-0.5">{{ pageSubtitle }}</p>
      </div>

      <div
        v-if="error"
        class="flex items-start gap-2 bg-danger/10 border border-danger/30 text-danger/90 text-sm rounded-lg px-4 py-3"
      >
        <Icon icon="lucide:circle-alert" class="w-4 h-4 mt-0.5 shrink-0" />
        {{ error }}
      </div>

      <!-- PRD Rule 10: Contextual banner without destination accounts -->
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

      <div ref="formRef">
        <TransactionForm
          :type="type"
          :disabled="isSubmitting"
          :editing-item="editingItem"
          @submit="handleSubmit"
          @cancel="handleEditCancel"
        />
      </div>

      <TransactionList
        :type="type"
        :items="items"
        :deactivated-count="deactivatedCount"
        v-model:hide-deactivated="hideDeactivated"
        @edit="handleEdit"
        @relocate="handleRequestRelocate"
        @delete="deleteConfirm.request"
        @restore="handleRestore"
        @hard-delete="handleRequestHardDelete"
      />

    </div>
  </div>

  <!-- Relocate Modal (PRD Rule 7) -->
  <RelocateMovementModal
    v-model:open="isRelocateModalOpen"
    :transaction="relocatingItem"
    @confirm="handleRelocateConfirm"
  />

  <!-- Relocate Warning Modal (PRD Rule 9) -->
  <RelocateRestoreWarningModal
    v-model:open="isRestoreWarningOpen"
    :transaction="restoreWarningItem"
    @confirm="handleRestoreWarningConfirm"
    @cancel="() => { isRestoreWarningOpen = false; restoreWarningItem = null }"
  />

  <!-- Soft Delete Modal -->
  <AppModal
    v-model:open="deleteConfirm.isOpen.value"
    :title="deleteModalTitle"
    :description="deleteConfirm.target.value ? `¿Deseas desactivar '${deleteConfirm.target.value.reason}'? Quedará excluido del saldo y podrás reactivarlo.` : undefined"
    confirm-label="Desactivar"
    cancel-label="Cancelar"
    variant="danger"
    :require-reason="true"
    :reason-label="deleteReasonLabel"
    reason-placeholder="Ej: duplicado, corrección de cálculo..."
    @confirm="handleDeleteConfirm"
    @cancel="deleteConfirm.cancel"
  />

  <!-- Hard Delete Modal (PRD 6.2) -->
  <AppModal
    v-model:open="hardDeleteConfirm.isOpen.value"
    title="Eliminar permanentemente"
    description="Esta acción es permanente y no se puede deshacer. El registro será eliminado de la base de datos."
    confirm-label="Eliminar permanentemente"
    cancel-label="Cancelar"
    variant="danger"
    @confirm="handleHardDeleteConfirm"
    @cancel="hardDeleteConfirm.cancel"
  />
</template>