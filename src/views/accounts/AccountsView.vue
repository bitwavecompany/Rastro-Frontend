<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useToastStore } from '@/stores/useToastStore'
import AppModal from '@/components/ui/AppModal.vue'
import type { Account, AccountType, CreateAccountPayload } from '@/types/account'

const store = useAccountsStore()
const toast = useToastStore()
const router = useRouter()

const totalBalance = computed(() => {
  return store.accounts.reduce((sum, account) => sum + account.amount, 0)
})

type AccountForm = {
  name: string
  type: AccountType
  amount: number | ''
  description: string
}

type AccountFormErrors = Partial<Record<'name' | 'amount', string>>

function emptyForm(): AccountForm {
  return { name: '', type: 'bank', amount: '', description: '' }
}

const showCreateModal = ref(false)
const createForm = reactive<AccountForm>(emptyForm())
const createErrors = reactive<AccountFormErrors>({})

function openCreateModal() {
  Object.assign(createForm, emptyForm())
  delete createErrors.name
  delete createErrors.amount
  showCreateModal.value = true
}

function validateForm(form: AccountForm, errors: AccountFormErrors): boolean {
  delete errors.name
  delete errors.amount
  if (!form.name.trim()) errors.name = 'El nombre es obligatorio'
  if (form.amount === '' || Number(form.amount) < 0) errors.amount = 'Ingresa un monto válido'
  return !errors.name && !errors.amount
}

async function handleCreateConfirm() {
  if (!validateForm(createForm, createErrors)) return
  
  const payload: CreateAccountPayload = {
    name: createForm.name.trim(),
    type: createForm.type,
    amount: Number(createForm.amount),
    ...(createForm.description.trim() && { description: createForm.description.trim() }),
  }
  
  try {
    await store.add(payload)
    toast.success('Cuenta creada exitosamente')
    showCreateModal.value = false
  } catch (error) {
    toast.error('Error al crear la cuenta')
  }
}

function handleCreateCancel() {
  showCreateModal.value = false
}

const showDeleteModal = ref(false)
const accountToDelete = ref<Account | null>(null)

function handleDeleteRequest(e: Event, account: Account) {
  e.stopPropagation()
  accountToDelete.value = account
  showDeleteModal.value = true
}

async function handleDeleteConfirm() {
  if (!accountToDelete.value) return
  
  try {
    await store.remove(accountToDelete.value.id)
    toast.success('Cuenta eliminada')
  } catch (error) {
    toast.error('Error al eliminar la cuenta')
  } finally {
    accountToDelete.value = null
    showDeleteModal.value = false
  }
}

function handleDeleteCancel() {
  accountToDelete.value = null
  showDeleteModal.value = false
}

function goToDetail(account: Account) {
  router.push({ name: 'account-detail', params: { id: account.id } })
}

function accountIcon(type: string) {
  return type === 'cash' ? 'lucide:banknote' : 'lucide:building-2'
}

function accountColorIcon(type: string) {
  return type === 'cash' ? 'bg-income/20 text-income/90' : 'bg-primary/20 text-primary/90'
}

function accountBadge(type: string) {
  return type === 'cash' ? 'bg-income/20 text-income/90' : 'bg-primary/20 text-primary/90'
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}
</script>

<template>
  <div class="min-h-full bg-gray-50 px-6 py-8">
    <div class="space-y-5">

      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Cuentas</h1>
        <p class="text-sm text-gray-400 mt-0.5">Administra tus cuentas</p>
      </div>

      <div class="bg-gray-900 rounded-3xl p-6 shadow-lg flex items-center justify-between text-white relative overflow-hidden">
        <div class="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        <div class="absolute right-12 -bottom-10 w-24 h-24 bg-primary/20 rounded-full blur-xl pointer-events-none"></div>
        
        <div class="flex items-center gap-4 relative z-10">
          <div class="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0 backdrop-blur-md">
            <Icon icon="lucide:vault" class="w-6 h-6 text-white" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-300">Patrimonio total</p>
            <p class="text-3xl font-bold tracking-tight mt-0.5">{{ formatAmount(totalBalance) }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

        <div
          v-for="account in store.accounts"
          :key="account.id"
          @click="goToDetail(account)"
          class="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-start gap-4
                 cursor-pointer hover:border-gray-300 hover:shadow-md transition-all group"
        >
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            :class="accountColorIcon(account.type)"
          >
            <Icon :icon="accountIcon(account.type)" class="w-5 h-5" />
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 truncate">{{ account.name }}</p>
            <p class="text-base font-bold text-gray-900 mt-0.5">{{ formatAmount(account.amount) }}</p>
            <p v-if="account.description" class="text-xs text-gray-400 mt-0.5 truncate">
              {{ account.description }}
            </p>
            <span
              class="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium"
              :class="accountBadge(account.type)"
            >
              {{ account.type === 'cash' ? 'Efectivo' : 'Banco' }}
            </span>
          </div>

          <div class="shrink-0 flex flex-col gap-0.5">
            <button
              v-if="account.type !== 'cash'"
              @click="handleDeleteRequest($event, account)"
              class="p-1.5 rounded-md text-gray-300 hover:text-danger/80 hover:bg-danger/10 transition-colors"
              title="Eliminar"
            >
              <Icon icon="lucide:trash-2" class="w-4 h-4" />
            </button>
            <Icon
              icon="lucide:chevron-right"
              class="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors mt-1"
            />
          </div>
        </div>

        <button
          @click="openCreateModal"
          class="bg-white rounded-2xl border-2 border-dashed border-gray-200 shadow-sm p-5
                 flex flex-col items-center justify-center gap-2 min-h-[88px]
                 text-gray-400 hover:border-primary/50 hover:text-primary/100 hover:bg-primary/10/40
                 transition-colors group"
        >
          <div class="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
            <Icon icon="lucide:plus" class="w-5 h-5" />
          </div>
          <span class="text-xs font-medium">Nueva cuenta</span>
        </button>

      </div>
    </div>
  </div>

  <AppModal
    v-model:open="showCreateModal"
    title="Nueva cuenta"
    confirm-label="Crear"
    cancel-label="Cancelar"
    variant="default"
    @confirm="handleCreateConfirm"
    @cancel="handleCreateCancel"
  >
    <template #body>
      <div class="space-y-3 px-6 pb-5">
        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Nombre <span class="text-danger/60">*</span>
          </label>
          <input
            v-model="createForm.name"
            type="text"
            placeholder="Ej: Banco Pichincha"
            class="w-full px-3 py-2 rounded-lg border text-sm text-gray-900 placeholder-gray-400
                   focus:outline-none focus:ring-2 focus:ring-primary/100 focus:border-transparent transition"
            :class="createErrors.name ? 'border-danger/60 bg-danger/10' : 'border-gray-300'"
          />
          <p v-if="createErrors.name" class="mt-1 text-xs text-danger/80">{{ createErrors.name }}</p>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Monto <span class="text-danger/60">*</span>
          </label>
          <div class="relative">
            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs select-none">$</span>
            <input
              v-model="createForm.amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              class="w-full pl-6 pr-3 py-2 rounded-lg border text-sm text-gray-900 placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-primary/100 focus:border-transparent transition"
              :class="createErrors.amount ? 'border-danger/60 bg-danger/10' : 'border-gray-300'"
            />
          </div>
          <p v-if="createErrors.amount" class="mt-1 text-xs text-danger/80">{{ createErrors.amount }}</p>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Tipo
          </label>
          <div class="flex rounded-lg border border-gray-300 overflow-hidden divide-x divide-gray-300 text-sm">
            <button
              type="button"
              @click="createForm.type = 'cash'"
              class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 font-medium transition-colors"
              :class="createForm.type === 'cash' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'"
            >
              <Icon icon="lucide:banknote" class="w-3.5 h-3.5 shrink-0" />
              Efectivo
            </button>
            <button
              type="button"
              @click="createForm.type = 'bank'"
              class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 font-medium transition-colors"
              :class="createForm.type === 'bank' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'"
            >
              <Icon icon="lucide:building-2" class="w-3.5 h-3.5 shrink-0" />
              Banco
            </button>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Descripción
          </label>
          <input
            v-model="createForm.description"
            type="text"
            placeholder="Opcional"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900
                   placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/100
                   focus:border-transparent transition"
          />
        </div>
      </div>
    </template>
  </AppModal>

  <AppModal
    v-model:open="showDeleteModal"
    title="Eliminar cuenta"
    :description="`¿Deseas eliminar '${accountToDelete?.name}'?`"
    confirm-label="Eliminar"
    cancel-label="Cancelar"
    variant="danger"
    @confirm="handleDeleteConfirm"
    @cancel="handleDeleteCancel"
  />
</template>