<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { db, type DlqEntry } from '@/database/db'
import { enqueueOutbox } from '@/sync/outbox'
import { useToastStore } from '@/stores/useToastStore'
import { formatDate } from '@/utils/formatters'
import AppModal from '@/components/ui/AppModal.vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const toast = useToastStore()
const items = ref<DlqEntry[]>([])
const isLoading = ref(false)

async function loadDlq() {
  isLoading.value = true
  try {
    items.value = await db.dlq.toArray()
  } catch (error) {
    console.error('Error loading DLQ items', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadDlq()
})

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      loadDlq()
    }
  }
)

async function handleRetry(item: DlqEntry) {
  try {
    if (item.seq) {
      await db.dlq.delete(item.seq)
    }
    await enqueueOutbox(item.entity, item.entityId, item.op, item.payload)
    toast.success('Operación reencolada para sincronización')
    await loadDlq()
  } catch (_error: unknown) {
    toast.error('Error al reintentar la operación')
  }
}

async function handleDismiss(item: DlqEntry) {
  try {
    if (item.seq) {
      await db.dlq.delete(item.seq)
    }
    // PRD 7.3: Cascade discard associated transaction errors if discarding an account
    if (item.entity === 'accounts' && item.entityId) {
      const allDlq = await db.dlq.toArray()
      const relatedTxEntries = allDlq.filter(entry =>
        entry.entity === 'transactions' &&
        entry.payload &&
        typeof entry.payload === 'object' &&
        'account_id' in entry.payload &&
        (entry.payload as { account_id?: string }).account_id === item.entityId
      )
      for (const rel of relatedTxEntries) {
        if (rel.seq) {
          await db.dlq.delete(rel.seq)
        }
      }
    }
    toast.info('Operación descartada')
    await loadDlq()
  } catch (_error: unknown) {
    toast.error('Error al descartar')
  }
}

async function handleClearAll() {
  try {
    await db.dlq.clear()
    toast.info('Bandeja de errores vaciada')
    await loadDlq()
  } catch (_error: unknown) {
    toast.error('Error al limpiar la bandeja')
  }
}
</script>

<template>
  <AppModal
    :open="open"
    title="Bandeja de Errores de Sincronización (DLQ)"
    confirm-label="Cerrar"
    :cancel-label="items.length > 0 ? 'Limpiar todo' : undefined"
    @confirm="emit('update:open', false)"
    @cancel="handleClearAll"
    @update:open="val => emit('update:open', val)"
  >
    <template #body>
      <div class="px-6 pb-6 space-y-4 max-h-[60vh] overflow-y-auto">
        <p class="text-xs text-gray-500">
          Operaciones que fueron rechazadas por el servidor durante la sincronización (ej. error 403 o 422). Puedes revisarlas, reintentarlas o descartarlas.
        </p>

        <div v-if="items.length === 0" class="py-8 text-center">
          <Icon icon="lucide:check-circle" class="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <p class="text-sm font-semibold text-gray-800">No hay errores pendientes</p>
          <p class="text-xs text-gray-400 mt-0.5">Todas tus operaciones sincronizadas están al día.</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="item in items"
            :key="item.seq"
            class="bg-gray-50 rounded-xl p-3.5 border border-gray-200 space-y-2 text-xs"
          >
            <div class="flex items-center justify-between">
              <span class="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-danger/10 text-danger">
                Error {{ item.errorCode }} · {{ item.entity }} ({{ item.op }})
              </span>
              <span class="text-[10px] text-gray-400">
                {{ formatDate(item.failedAt) }}
              </span>
            </div>

            <p class="text-gray-800 font-medium leading-relaxed">
              {{ item.errorMessage }}
            </p>

            <div class="pt-2 border-t border-gray-200/60 flex items-center justify-end gap-2">
              <button
                type="button"
                @click="handleDismiss(item)"
                class="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition"
              >
                Descartar
              </button>
              <button
                type="button"
                @click="handleRetry(item)"
                class="px-2.5 py-1 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800 transition"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </AppModal>
</template>
