<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import { useToastStore } from '@/stores/useToastStore'
import { useAccountDetail } from '@/composables/useAccountDetail'
import { useAccountForm } from '@/composables/useAccountForm'
import { useMovementForm } from '@/composables/useMovementForm'
import { formatAmount, formatDate } from '@/utils/formatters'
import AppModal from '@/components/ui/AppModal.vue'
import AppFormDialog from '@/components/ui/AppFormDialog.vue'
import type { Movement, MovementTab } from '@/composables/useAccountDetail'

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

const showDeleteAccountModal = ref(false)
const showDeleteMovementModal = ref(false)
const movementToDelete = ref<Movement | null>(null)

const tabs: { key: MovementTab; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'incomes', label: 'Ingresos' },
  { key: 'expenses', label: 'Gastos' },
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
  } catch (error) {
    toast.error('Error al eliminar la cuenta')
  }
}

function handleDeleteMovementRequest(movement: Movement) {
  movementToDelete.value = movement
  showDeleteMovementModal.value = true
}

async function handleDeleteMovementConfirm(reason?: string) {
  if (!movementToDelete.value) return
  try {
    await transactionsStore.remove(movementToDelete.value.id, reason)
    toast.success('Registro eliminado')
  } catch (error) {
    toast.error('Error al eliminar el registro')
  } finally {
    movementToDelete.value = null
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
          v-if="account.type !== 'cash'"
          @click="showDeleteAccountModal = true"
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
            <div
              v-for="movement in filteredMovements"
              :key="`${movement.kind}-${movement.id}`"
              class="px-4 py-3 flex items-start gap-3 transition-colors"
              :class="movement.deletedAt ? 'opacity-75 bg-gray-50/50' : 'hover:bg-gray-50/60'"
            >
              <div
                class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                :class="movement.kind === 'income' ? 'bg-income/20' : 'bg-danger/20'"
              >
                <Icon
                  :icon="movement.kind === 'income' ? 'lucide:trending-up' : 'lucide:receipt'"
                  class="w-3.5 h-3.5"
                  :class="movement.kind === 'income' ? 'text-income' : 'text-danger/80'"
                />
              </div>
              <div class="flex-1 min-w-0" :class="{ 'line-through': movement.deletedAt }">
                <p class="text-sm font-medium text-gray-800 truncate">{{ movement.reason }}</p>
                <p v-if="movement.description" class="text-xs text-gray-400 truncate mt-0.5">
                  {{ movement.description }}
                </p>
                <p class="text-xs text-gray-400 mt-0.5">{{ formatDate(movement.createdAt) }}</p>
              </div>
              <div class="shrink-0 flex items-center gap-0.5">
                <p
                  class="text-sm font-semibold mr-2"
                  :class="[movement.kind === 'income' ? 'text-income' : 'text-danger/80', { 'line-through': movement.deletedAt }]"
                >
                  {{ movement.kind === 'income' ? '+' : '-' }}{{ formatAmount(movement.amount) }}
                </p>
                
                <template v-if="!movement.deletedAt">
                  <button
                    @click="movementForm.open(movement)"
                    class="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Editar"
                  >
                    <Icon icon="lucide:pencil" class="w-4 h-4" />
                  </button>
                  <button
                    @click="handleDeleteMovementRequest(movement)"
                    class="p-1.5 rounded-md text-gray-400 hover:text-danger hover:bg-danger/10 transition-colors"
                    title="Eliminar"
                  >
                    <Icon icon="lucide:trash-2" class="w-4 h-4" />
                  </button>
                </template>
                <span v-else class="text-[10px] font-bold text-danger/70 uppercase tracking-wider px-1">Anulado</span>
              </div>
            </div>
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
                <tr
                  v-for="movement in filteredMovements"
                  :key="`${movement.kind}-${movement.id}`"
                  class="border-b border-gray-50 last:border-0 transition-colors"
                  :class="movement.deletedAt ? 'opacity-75 bg-gray-50/50' : 'hover:bg-gray-50/60'"
                >
                  <td class="px-6 py-4" :class="{ 'opacity-80': movement.deletedAt }">
                    <div
                      class="w-7 h-7 rounded-lg flex items-center justify-center"
                      :class="movement.kind === 'income' ? 'bg-income/20' : 'bg-danger/20'"
                    >
                      <Icon
                        :icon="movement.kind === 'income' ? 'lucide:trending-up' : 'lucide:receipt'"
                        class="w-3.5 h-3.5"
                        :class="movement.kind === 'income' ? 'text-income' : 'text-danger/80'"
                      />
                    </div>
                  </td>
                  <td class="px-6 py-4 text-gray-700 max-w-[160px] truncate font-medium" :class="{ 'line-through': movement.deletedAt }">
                    {{ movement.reason }}
                  </td>
                  <td class="px-6 py-4 text-gray-400 max-w-xs truncate" :class="{ 'line-through': movement.deletedAt }">
                    <span v-if="movement.description">{{ movement.description }}</span>
                    <span v-else class="text-gray-300">—</span>
                  </td>
                  <td class="px-6 py-4 text-gray-400 whitespace-nowrap text-xs">
                    {{ formatDate(movement.createdAt) }}
                  </td>
                  <td
                    class="px-6 py-4 text-right font-semibold whitespace-nowrap"
                    :class="[movement.kind === 'income' ? 'text-income' : 'text-danger/80', { 'line-through': movement.deletedAt }]"
                  >
                    {{ movement.kind === 'income' ? '+' : '-' }}{{ formatAmount(movement.amount) }}
                  </td>
                  <td class="px-6 py-4 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1">
                      <template v-if="!movement.deletedAt">
                        <button
                          @click="movementForm.open(movement)"
                          class="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Editar"
                        >
                          <Icon icon="lucide:pencil" class="w-4 h-4" />
                        </button>
                        <button
                          @click="handleDeleteMovementRequest(movement)"
                          class="p-1.5 rounded-md text-gray-400 hover:text-danger hover:bg-danger/10 transition-colors"
                          title="Eliminar"
                        >
                          <Icon icon="lucide:trash-2" class="w-4 h-4" />
                        </button>
                      </template>
                      <span v-else class="text-xs font-bold text-danger/70 uppercase">Anulado</span>
                    </div>
                  </td>
                </tr>
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
    <div>
      <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
        Nombre <span class="text-danger/60">*</span>
      </label>
      <input
        v-model="accountForm.form.name"
        type="text"
        placeholder="Ej: Banco Pichincha"
        class="w-full px-3 py-2 rounded-lg border text-sm text-gray-900 placeholder-gray-400
               focus:outline-none focus:ring-2 focus:ring-primary/100 focus:border-transparent transition"
        :class="accountForm.errors.name ? 'border-danger/60 bg-danger/10' : 'border-gray-300'"
      />
      <p v-if="accountForm.errors.name" class="mt-1 text-xs text-danger/80">{{ accountForm.errors.name }}</p>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
        Saldo inicial <span class="text-danger/60">*</span>
      </label>
      <div class="relative">
        <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs select-none">$</span>
        <input
          v-model="accountForm.form.amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          class="w-full pl-6 pr-3 py-2 rounded-lg border text-sm text-gray-900 placeholder-gray-400
                 focus:outline-none focus:ring-2 focus:ring-primary/100 focus:border-transparent transition"
          :class="accountForm.errors.amount ? 'border-danger/60 bg-danger/10' : 'border-gray-300'"
        />
      </div>
      <p v-if="accountForm.errors.amount" class="mt-1 text-xs text-danger/80">{{ accountForm.errors.amount }}</p>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Tipo</label>
      <div class="flex rounded-lg border border-gray-300 overflow-hidden divide-x divide-gray-300 text-sm">
        <button
          type="button"
          @click="accountForm.form.type = 'cash'"
          class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 font-medium transition-colors"
          :class="accountForm.form.type === 'cash' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'"
        >
          <Icon icon="lucide:banknote" class="w-3.5 h-3.5 shrink-0" />
          Efectivo
        </button>
        <button
          type="button"
          @click="accountForm.form.type = 'bank'"
          class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 font-medium transition-colors"
          :class="accountForm.form.type === 'bank' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'"
        >
          <Icon icon="lucide:building-2" class="w-3.5 h-3.5 shrink-0" />
          Banco
        </button>
      </div>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Descripción</label>
      <input
        v-model="accountForm.form.description"
        type="text"
        placeholder="Opcional"
        class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900
               placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/100
               focus:border-transparent transition"
      />
    </div>
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
      <div class="relative">
        <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs select-none">$</span>
        <input
          v-model="movementForm.form.amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          class="w-full pl-6 pr-3 py-2 rounded-lg border text-sm text-gray-900 placeholder-gray-400
                 focus:outline-none focus:ring-2 focus:ring-primary/100 focus:border-transparent transition"
          :class="movementForm.errors.amount ? 'border-danger/60 bg-danger/10' : 'border-gray-300'"
        />
      </div>
      <p v-if="movementForm.errors.amount" class="mt-1 text-xs text-danger/80">{{ movementForm.errors.amount }}</p>
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
      <div class="flex rounded-lg border border-gray-300 overflow-hidden divide-x divide-gray-300 text-sm">
        <button
          type="button"
          @click="movementForm.form.paymentType = 'cash'"
          class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 font-medium transition-colors"
          :class="movementForm.form.paymentType === 'cash' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'"
        >
          <Icon icon="lucide:banknote" class="w-3.5 h-3.5 shrink-0" />
          Efectivo
        </button>
        <button
          type="button"
          @click="movementForm.form.paymentType = 'transfer'"
          class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 font-medium transition-colors"
          :class="movementForm.form.paymentType === 'transfer' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'"
        >
          <Icon icon="lucide:arrow-right-left" class="w-3.5 h-3.5 shrink-0" />
          Transferencia
        </button>
      </div>
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
    v-model:open="showDeleteAccountModal"
    title="Eliminar cuenta"
    :description="`¿Deseas eliminar '${account?.name}'? Esta acción no se puede deshacer.`"
    confirm-label="Eliminar"
    cancel-label="Cancelar"
    variant="danger"
    @confirm="handleDeleteAccountConfirm"
    @cancel="showDeleteAccountModal = false"
  />

  <AppModal
    v-model:open="showDeleteMovementModal"
    title="Eliminar registro"
    :description="movementToDelete ? `¿Deseas eliminar '${movementToDelete.reason}'?` : undefined"
    confirm-label="Eliminar"
    cancel-label="Cancelar"
    variant="danger"
    :require-reason="true"
    reason-label="¿Por qué eliminas este registro?"
    reason-placeholder="Ej: duplicado, error de cálculo..."
    @confirm="handleDeleteMovementConfirm"
    @cancel="movementToDelete = null"
  />
</template>