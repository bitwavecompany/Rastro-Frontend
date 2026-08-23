<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import { useProfileStore } from '@/stores/useProfileStore'
import { useToastStore } from '@/stores/useToastStore'
import { useDeleteConfirm } from '@/composables/useDeleteConfirm'
import TransactionForm from '@/components/transactions/TransactionForm.vue'
import TransactionList from '@/components/transactions/TransactionList.vue'
import AppModal from '@/components/ui/AppModal.vue'
import type { Transaction, CreateTransactionPayload, TransactionKind } from '@/types/transaction'

const props = defineProps<{
  kind: TransactionKind
}>()

const store = useTransactionsStore()
const profileStore = useProfileStore()
const toast = useToastStore()

const items = computed(() =>
  props.kind === 'expense' ? store.expenses : store.incomes
)

const maxRecords = computed(() => {
  const roleToken = profileStore.profile.roleToken
  if (roleToken === 'Z3Vlc3RfbGV2ZWxfMjAyNg==') return 25
  if (roleToken === 'cmVnaXN0ZXJlZF9sZXZlbF8yMDI2') return 50
  return Infinity
})

const pageTitle = computed(() =>
  props.kind === 'expense' ? 'Gastos' : 'Ingresos'
)

const pageSubtitle = computed(() =>
  props.kind === 'expense'
    ? 'Registra y controla tus gastos'
    : 'Registra y controla tus ingresos'
)

const deleteModalTitle = computed(() =>
  props.kind === 'expense' ? 'Eliminar gasto' : 'Eliminar ingreso'
)

const deleteReasonLabel = computed(() =>
  props.kind === 'expense'
    ? '¿Por qué eliminas este gasto?'
    : '¿Por qué eliminas este ingreso?'
)

const editingItem  = ref<Transaction | null>(null)
const formRef      = ref<HTMLElement | null>(null)
const isSubmitting = ref(false)
const error        = ref<string | null>(null)

const deleteConfirm = useDeleteConfirm<Transaction>()

async function handleSubmit(payload: CreateTransactionPayload) {
  if (!editingItem.value) {
    const activeRecords = items.value.filter(t => !t.deletedAt).length

    if (activeRecords >= maxRecords.value) {
      const typeName = props.kind === 'expense' ? 'gastos' : 'ingresos'
      if (profileStore.profile.roleToken === 'Z3Vlc3RfbGV2ZWxfMjAyNg==') {
        toast.warning(`Has excedido el límite de ${maxRecords.value} ${typeName}. Por favor, inicia sesión.`, 5000)
      } else if (profileStore.profile.roleToken === 'cmVnaXN0ZXJlZF9sZXZlbF8yMDI2') {
        toast.warning(`Has excedido el límite de ${maxRecords.value} ${typeName}. Mejora a Premium para registros ilimitados.`, 5000)
      }
      return
    }
  }

  isSubmitting.value = true
  error.value        = null
  try {
    if (editingItem.value) {
      await store.update(editingItem.value.id, payload)
      toast.success(props.kind === 'expense' ? 'Gasto actualizado' : 'Ingreso actualizado')
      editingItem.value = null
    } else {
      await store.add(payload)
      toast.success(props.kind === 'expense' ? 'Gasto registrado' : 'Ingreso registrado')
    }
  } catch {
    error.value = 'Error al guardar. Intenta de nuevo.'
    toast.error('Ocurrió un error al guardar')
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

async function handleDeleteConfirm(reason?: string) {
  if (!deleteConfirm.target.value) return
  if (editingItem.value?.id === deleteConfirm.target.value.id) editingItem.value = null
  try {
    await store.remove(deleteConfirm.target.value.id, reason)
    toast.success(props.kind === 'expense' ? 'Gasto eliminado' : 'Ingreso eliminado')
  } catch {
    toast.error('Error al eliminar el registro')
  } finally {
    deleteConfirm.cancel()
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
        @edit="handleEdit"
        @delete="deleteConfirm.request"
      />

    </div>
  </div>

  <AppModal
    v-model:open="deleteConfirm.isOpen.value"
    :title="deleteModalTitle"
    :description="deleteConfirm.target.value ? `¿Deseas eliminar '${deleteConfirm.target.value.reason}'?` : undefined"
    confirm-label="Eliminar"
    cancel-label="Cancelar"
    variant="danger"
    :require-reason="true"
    :reason-label="deleteReasonLabel"
    reason-placeholder="Ej: fue un error, duplicado, ya no aplica..."
    @confirm="handleDeleteConfirm"
    @cancel="deleteConfirm.cancel"
  />
</template>