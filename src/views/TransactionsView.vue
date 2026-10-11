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
import type { TransactionKind } from '@/constants/transactions'

const props = defineProps<{
  kind: TransactionKind
}>()

const router = useRouter()
const store = useTransactionsStore()
const accountsStore = useAccountsStore()
const entitlementsStore = useEntitlementsStore()
const toast = useToastStore()

// PRD Regla 10: Banner contextual si no hay cuentas destino disponibles para traslado
const relocateBanner = ref<{ text: string; buttonLabel: string; route: string } | null>(null)

// Por defecto los registros desactivados son visibles; la opción de ocultarlos es la variable
const hideDeactivated = ref(false)

const allItems = computed(() =>
  props.kind === 'expense' ? store.allExpenses : store.allIncomes
)

// PRD 2.2 & 4.3: Los movimientos no tienen límite en ningún plan
const items = computed(() =>
  hideDeactivated.value
    ? allItems.value.filter(t => !t.deletedAt && !t.deleted_at)
    : allItems.value
)

const deactivatedCount = computed(() =>
  allItems.value.filter(t => !!(t.deletedAt || t.deleted_at)).length
)

const pageTitle = computed(() =>
  props.kind === 'expense' ? 'Gastos' : 'Ingresos'
)

const pageSubtitle = computed(() =>
  props.kind === 'expense'
    ? 'Registra y controla tus gastos'
    : 'Registra y controla tus ingresos'
)

const deleteModalTitle = computed(() =>
  props.kind === 'expense' ? 'Desactivar gasto' : 'Desactivar ingreso'
)

const deleteReasonLabel = computed(() =>
  props.kind === 'expense'
    ? '¿Por qué desactivas este gasto?'
    : '¿Por qué desactivas este ingreso?'
)

const editingItem = ref<Transaction | null>(null)
const formRef = ref<HTMLElement | null>(null)
const isSubmitting = ref(false)
const error = ref<string | null>(null)

const deleteConfirm = useDeleteConfirm<Transaction>()
const hardDeleteConfirm = useDeleteConfirm<Transaction>()

// Estado de traslado (Regla 7)
const relocatingItem = ref<Transaction | null>(null)
const isRelocateModalOpen = ref(false)

// Estado de advertencia al reactivar traslado (Regla 9)
const restoreWarningItem = ref<Transaction | null>(null)
const isRestoreWarningOpen = ref(false)

async function handleSubmit(payload: CreateTransactionPayload) {
  isSubmitting.value = true
  error.value = null

  try {
    if (editingItem.value) {
      await store.update(editingItem.value.id, payload)
      toast.success(props.kind === 'expense' ? 'Gasto actualizado' : 'Ingreso actualizado')
      editingItem.value = null
    } else {
      await store.add(payload)
      toast.success(props.kind === 'expense' ? 'Gasto registrado' : 'Ingreso registrado')
    }
  } catch (err: any) {
    if (err.response?.status === 422) {
      const errors = err.response.data.errors
      error.value = errors[Object.keys(errors)[0]][0]
    } else {
      error.value = err.response?.data?.message || err.message || 'Error al guardar el movimiento'
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
    await store.relocate(relocatingItem.value.id, payload.destinationAccountId, payload.reason)
    toast.success(props.kind === 'expense' ? 'Gasto trasladado exitosamente' : 'Ingreso trasladado exitosamente')
    isRelocateModalOpen.value = false
    relocatingItem.value = null
  } catch (err: any) {
    toast.error(err.message || 'Error al trasladar el movimiento')
  }
}

async function handleDeleteConfirm(reason?: string) {
  if (!deleteConfirm.target.value) return
  if (editingItem.value?.id === deleteConfirm.target.value.id) editingItem.value = null
  try {
    await store.remove(deleteConfirm.target.value.id, reason)
    toast.success(props.kind === 'expense' ? 'Gasto desactivado' : 'Ingreso desactivado')
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message || 'Error al desactivar el registro'
    toast.error(msg)
  } finally {
    deleteConfirm.cancel()
  }
}

// PRD Regla 9: Advertencia al reactivar un registro trasladado
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
    toast.success(props.kind === 'expense' ? 'Gasto reactivado' : 'Ingreso reactivado')
  } catch (err: any) {
    toast.error(err.message || 'Error al reactivar el registro')
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
  } catch (err: any) {
    toast.error(err.message || 'Error al eliminar el registro')
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

      <div ref="formRef">
        <TransactionForm
          :kind="kind"
          :disabled="isSubmitting"
          :editing-item="editingItem"
          @submit="handleSubmit"
          @cancel="handleEditCancel"
        />
      </div>

      <TransactionList
        :kind="kind"
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

  <!-- Modal Soft Delete -->
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

  <!-- Modal Hard Delete (PRD 6.2) -->
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