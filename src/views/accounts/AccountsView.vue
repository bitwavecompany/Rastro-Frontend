<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useToastStore } from '@/stores/useToastStore'
import { useAccountForm } from '@/composables/useAccountForm'
import { useDeleteConfirm } from '@/composables/useDeleteConfirm'
import AccountCard from '@/components/accounts/AccountCard.vue'
import AccountFormFields from '@/components/accounts/AccountFormFields.vue'
import AppModal from '@/components/ui/AppModal.vue'
import type { Account } from '@/types/account'

const store = useAccountsStore()
const toast = useToastStore()
const router = useRouter()
const accountForm = useAccountForm()

const deleteConfirm = useDeleteConfirm<Account>()

async function handleDeleteConfirm() {
  if (!deleteConfirm.target.value) return
  try {
    await store.remove(deleteConfirm.target.value.id)
    toast.success('Cuenta eliminada')
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Error al eliminar la cuenta')
  } finally {
    deleteConfirm.cancel()
  }
}

function goToDetail(account: Account) {
  router.push({ name: 'account-detail', params: { id: account.id } })
}
</script>

<template>
  <div class="min-h-full bg-gray-50 px-6 py-8">
    <div class="space-y-5">

      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Cuentas</h1>
        <p class="text-sm text-gray-400 mt-0.5">Administra tus cuentas</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

        <AccountCard
          v-for="account in store.accounts"
          :key="account.id"
          :account="account"
          @click="goToDetail(account)"
          @delete="deleteConfirm.request(account)"
        />

        <button
          @click="accountForm.open()"
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
    :open="accountForm.isOpen.value"
    title="Nueva cuenta"
    confirm-label="Crear"
    cancel-label="Cancelar"
    variant="default"
    @confirm="() => accountForm.submit()"
    @cancel="accountForm.close()"
    @update:open="val => !val && accountForm.close()"
  >
    <template #body>
      <div class="space-y-3 px-6 pb-5">
        <AccountFormFields :form="accountForm.form" :errors="accountForm.errors" />
      </div>
    </template>
  </AppModal>

  <AppModal
    v-model:open="deleteConfirm.isOpen.value"
    title="Eliminar cuenta"
    :description="`¿Deseas eliminar '${deleteConfirm.target.value?.name}'?`"
    confirm-label="Eliminar"
    cancel-label="Cancelar"
    variant="danger"
    @confirm="handleDeleteConfirm"
    @cancel="deleteConfirm.cancel"
  />
</template>