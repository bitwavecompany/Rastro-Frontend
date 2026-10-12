<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useEntitlementsStore } from '@/stores/useEntitlementsStore'
import { useToastStore } from '@/stores/useToastStore'
import { useAccountForm } from '@/composables/useAccountForm'
import { useDeleteConfirm } from '@/composables/useDeleteConfirm'
import AccountCard from '@/components/accounts/AccountCard.vue'
import AccountFormFields from '@/components/accounts/AccountFormFields.vue'
import AppModal from '@/components/ui/AppModal.vue'
import type { Account } from '@/types/account'

const store = useAccountsStore()
const entitlements = useEntitlementsStore()
const toast = useToastStore()
const router = useRouter()
const accountForm = useAccountForm()

// Por defecto los registros desactivados son visibles; la opción de ocultarlos es la variable
const hideDeactivated = ref(false)

const deleteConfirm = useDeleteConfirm<Account>()
const restoreConfirm = useDeleteConfirm<Account>()

const displayedAccounts = computed(() => {
  return hideDeactivated.value ? store.accounts : store.allAccounts
})

async function handleDeleteConfirm() {
  if (!deleteConfirm.target.value) return
  try {
    await store.remove(deleteConfirm.target.value.id)
    toast.success('Cuenta desactivada exitosamente')
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    toast.error(err.response?.data?.message || err.message || 'Error al desactivar la cuenta')
  } finally {
    deleteConfirm.cancel()
  }
}

async function handleRestoreConfirm() {
  if (!restoreConfirm.target.value) return
  if (!entitlements.canCreateAccount) {
    toast.warning('No tienes slots disponibles en tu plan. Desactiva una cuenta o mejora a Premium.')
    restoreConfirm.cancel()
    return
  }
  try {
    await store.restore(restoreConfirm.target.value.id)
    toast.success('Cuenta reactivada exitosamente')
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    toast.error(err.response?.data?.message || err.message || 'Error al reactivar la cuenta')
  } finally {
    restoreConfirm.cancel()
  }
}

function goToDetail(account: Account) {
  router.push({ name: 'account-detail', params: { id: account.id } })
}
</script>

<template>
  <div class="min-h-full bg-gray-50 px-6 py-8">
    <div class="space-y-5">

      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Cuentas</h1>
          <p class="text-sm text-gray-400 mt-0.5">
            {{ entitlements.activeAccountsCount }} / {{ entitlements.maxAccounts === Infinity ? '∞' : entitlements.maxAccounts }} cuentas activas
          </p>
        </div>

        <button
          v-if="store.deactivatedAccounts.length > 0"
          type="button"
          @click="hideDeactivated = !hideDeactivated"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition"
          :class="hideDeactivated ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'"
        >
          <Icon :icon="hideDeactivated ? 'lucide:eye' : 'lucide:eye-off'" class="w-3.5 h-3.5" />
          {{ hideDeactivated ? `Mostrar desactivadas (${store.deactivatedAccounts.length})` : 'Ocultar desactivadas' }}
        </button>
      </div>

      <!-- PRD 9.3: Banner límite de cuentas Free -->
      <div
        v-if="entitlements.isFree && !entitlements.canCreateAccount"
        class="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start sm:items-center justify-between gap-3"
      >
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <Icon icon="lucide:alert-circle" class="w-4 h-4" />
          </div>
          <div>
            <p class="text-sm font-semibold text-amber-900">Alcanzaste el límite de 3 cuentas</p>
            <p class="text-xs text-amber-700 mt-0.5">Desactiva una cuenta existente o mejora a Premium para tener cuentas ilimitadas.</p>
          </div>
        </div>
        <button
          @click="router.push('/profile')"
          class="shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition"
        >
          Mejorar a Premium
        </button>
      </div>

      <!-- PRD 9.3: Banner límite de cuenta Invitado -->
      <div
        v-if="entitlements.isGuest"
        class="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start sm:items-center justify-between gap-3"
      >
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <Icon icon="lucide:sparkles" class="w-4 h-4" />
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-900">Modo Invitado: 1 cuenta activa (Efectivo)</p>
            <p class="text-xs text-gray-600 mt-0.5">Crea una cuenta gratuita para agregar más cuentas y respaldar tus datos en la nube.</p>
          </div>
        </div>
        <button
          @click="router.push('/register')"
          class="shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gray-900 text-white hover:bg-gray-800 transition"
        >
          Crear cuenta gratis
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

        <AccountCard
          v-for="account in displayedAccounts"
          :key="account.id"
          :account="account"
          @click="goToDetail(account)"
          @delete="deleteConfirm.request(account)"
          @restore="restoreConfirm.request(account)"
        />

        <button
          v-if="entitlements.canCreateAccount"
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

  <!-- Modal Crear/Editar Cuenta -->
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
        <AccountFormFields
          :form="accountForm.form"
          :errors="accountForm.errors"
          :is-default-account="accountForm.isDefault.value"
          :has-movements="accountForm.hasMovements.value"
        />
      </div>
    </template>
  </AppModal>

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

  <!-- Modal Desactivar Cuenta (Soft Delete) -->
  <AppModal
    v-model:open="deleteConfirm.isOpen.value"
    title="Desactivar cuenta"
    :description="`¿Deseas desactivar '${deleteConfirm.target.value?.name}'? Liberará 1 slot de tu plan y desactivará sus movimientos en cascada.`"
    confirm-label="Desactivar cuenta"
    cancel-label="Cancelar"
    variant="danger"
    @confirm="handleDeleteConfirm"
    @cancel="deleteConfirm.cancel"
  />

  <!-- Modal Reactivar Cuenta -->
  <AppModal
    v-model:open="restoreConfirm.isOpen.value"
    title="Reactivar cuenta"
    :description="`¿Deseas reactivar '${restoreConfirm.target.value?.name}'? Ocupará 1 slot de tu plan.`"
    confirm-label="Reactivar"
    cancel-label="Cancelar"
    variant="default"
    @confirm="handleRestoreConfirm"
    @cancel="restoreConfirm.cancel"
  />
</template>