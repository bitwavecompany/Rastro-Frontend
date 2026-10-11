<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/useProfileStore'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useSessionStore } from '@/stores/useSessionStore'
import { useToastStore } from '@/stores/useToastStore'
import { authApi } from '@/api/auth'
import AppModal from '@/components/ui/AppModal.vue'
import AppFormDialog from '@/components/ui/AppFormDialog.vue'

const router = useRouter()
const profileStore = useProfileStore()
const accountsStore = useAccountsStore()
const sessionStore = useSessionStore()
const toast = useToastStore()

const isDeactivatingId = ref<string | number | null>(null)

// PRD 9.4: Solo aplica si el usuario está registrado en plan Free y tiene más de 3 cuentas activas
const isDowngradedWithExcessAccounts = computed(() => {
  if (profileStore.profile.plan !== 'free') return false
  const activeCount = accountsStore.accounts.filter(a => !a.deletedAt && !a.deleted_at).length
  return activeCount > 3
})

const activeAccounts = computed(() => {
  return accountsStore.accounts.filter(a => !a.deletedAt && !a.deleted_at)
})

const excessCount = computed(() => {
  return Math.max(0, activeAccounts.value.length - 3)
})

// Regla 20: Desactivar con plan_downgrade
async function handleDeactivate(accountId: string | number) {
  try {
    isDeactivatingId.value = accountId
    await accountsStore.remove(accountId, 'plan_downgrade')
    toast.success('Cuenta desactivada exitosamente')
  } catch (error: any) {
    toast.error(error?.message || 'Error al desactivar la cuenta')
  } finally {
    isDeactivatingId.value = null
  }
}

// Regla 20: Eliminar permanentemente (hard delete directo)
const accountToHardDelete = ref<any | null>(null)
const isHardDeleteModalOpen = ref(false)
const isHardDeleting = ref(false)

function openHardDeleteConfirm(acc: any) {
  accountToHardDelete.value = acc
  isHardDeleteModalOpen.value = true
}

async function handleConfirmHardDelete() {
  if (!accountToHardDelete.value) return
  isHardDeleting.value = true
  try {
    await accountsStore.hardDelete(accountToHardDelete.value.id)
    toast.success('Cuenta y movimientos eliminados permanentemente')
    isHardDeleteModalOpen.value = false
    accountToHardDelete.value = null
  } catch (error: any) {
    toast.error(error?.message || 'Error al eliminar la cuenta permanentemente')
  } finally {
    isHardDeleting.value = false
  }
}

// Regla 21: Acciones de escape
// 1. Cerrar sesión
const isLogoutConfirmOpen = ref(false)
async function handleLogout() {
  try {
    await authApi.logout()
  } catch {
    // Si la red falla o token expiró, continuar
  } finally {
    sessionStore.clearTokens()
    await profileStore.clearAllLocalData()
    isLogoutConfirmOpen.value = false
    toast.info('Sesión cerrada')
    router.push('/login')
  }
}

// 2. Eliminar cuenta permanentemente (GDPR)
const isDeleteAccountConfirmOpen = ref(false)
const isDeletingAccount = ref(false)
async function handleDeleteAccount() {
  isDeletingAccount.value = true
  try {
    await authApi.deleteAccount()
    sessionStore.clearTokens()
    await profileStore.clearAllLocalData()
    toast.success('Cuenta eliminada permanentemente')
    router.push('/register')
  } catch (error: any) {
    toast.error(error?.response?.data?.message || 'Error al eliminar la cuenta')
  } finally {
    isDeletingAccount.value = false
    isDeleteAccountConfirmOpen.value = false
  }
}

// 3. Mejorar a Premium
const isUpgradeModalOpen = ref(false)
const upgradeBank = ref('')
const upgradeReceipt = ref('')
const isSubmittingUpgrade = ref(false)
const isUpgradePending = ref(Boolean(profileStore.profile.payment_receipt))

async function handleSubmitUpgrade() {
  if (!upgradeBank.value.trim() || !upgradeReceipt.value.trim()) {
    toast.error('Todos los campos son obligatorios')
    return
  }

  isSubmittingUpgrade.value = true
  try {
    await authApi.requestPremium({
      origin_bank: upgradeBank.value.trim(),
      transfer_receipt: upgradeReceipt.value.trim()
    })
    isUpgradePending.value = true
    isUpgradeModalOpen.value = false
    toast.info('Tu solicitud está en revisión (máx. 24h).')
  } catch (error: any) {
    toast.error(error?.response?.data?.message || 'Error al enviar comprobante')
  } finally {
    isSubmittingUpgrade.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isDowngradedWithExcessAccounts"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
    >
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <!-- Header con advertencia (Regla 19: infranqueable, sin botón X de cerrar) -->
        <div class="bg-amber-500/10 border-b border-amber-500/20 px-6 py-5 shrink-0">
          <div class="flex items-center gap-3.5">
            <div class="w-11 h-11 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Icon icon="lucide:alert-circle" class="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 class="text-base font-bold text-gray-900 leading-tight">
                Plan cambiado a Free
              </h2>
              <p class="text-xs text-amber-700 mt-0.5">
                Acción requerida para continuar usando la aplicación
              </p>
            </div>
          </div>
        </div>

        <!-- Cuerpo del modal -->
        <div class="p-6 space-y-4 overflow-y-auto flex-1">
          <!-- PRD Regla 20: Copy exacto de estado de cuentas excedentes -->
          <p class="text-sm text-gray-700 leading-relaxed font-medium">
            Tienes {{ activeAccounts.length }} cuentas activas. Tu plan Free permite 3. Debes desactivar o eliminar {{ excessCount }} cuenta{{ excessCount > 1 ? 's' : '' }} para continuar.
          </p>

          <!-- Estado de espera informativa si envió comprobante (Regla 21) -->
          <div
            v-if="isUpgradePending"
            class="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-2.5"
          >
            <Icon icon="lucide:clock" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Tu solicitud está en revisión (máx. 24h). Puedes esperar o desactivar cuentas para continuar en plan Free ahora.
            </p>
          </div>

          <!-- Listado de cuentas activas elegibles -->
          <div class="border border-gray-100 rounded-2xl divide-y divide-gray-100 overflow-hidden max-h-56 overflow-y-auto">
            <div
              v-for="acc in activeAccounts"
              :key="acc.id"
              class="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/70 transition"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <Icon
                    :icon="acc.type === 'cash' ? 'lucide:wallet' : 'lucide:building-2'"
                    class="w-4 h-4 text-gray-600"
                  />
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-semibold text-gray-900 truncate">{{ acc.name }}</p>
                    <span
                      v-if="acc.is_default"
                      class="px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary rounded-md shrink-0"
                    >
                      Principal
                    </span>
                  </div>
                  <p class="text-xs text-gray-400 capitalize">{{ acc.type === 'cash' ? 'Efectivo' : 'Banco' }}</p>
                </div>
              </div>

              <!-- Acciones por cuenta (Regla 20: Desactivar vs Eliminar permanentemente) -->
              <div class="flex items-center gap-1.5 shrink-0">
                <template v-if="!acc.is_default">
                  <button
                    type="button"
                    @click="handleDeactivate(acc.id)"
                    :disabled="isDeactivatingId === acc.id"
                    class="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-800 hover:bg-amber-500 hover:text-white transition-all disabled:opacity-50"
                    title="Desactiva la cuenta conservando registros con cascade_account_deactivation"
                  >
                    <span v-if="isDeactivatingId === acc.id">...</span>
                    <span v-else>Desactivar</span>
                  </button>
                  <button
                    type="button"
                    @click="openHardDeleteConfirm(acc)"
                    class="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-danger/10 text-danger hover:bg-danger hover:text-white transition-all"
                    title="Borra físicamente la cuenta y todos sus registros"
                  >
                    Eliminar
                  </button>
                </template>
                <span
                  v-else
                  class="text-[11px] font-medium text-gray-400 italic px-2 py-1"
                >
                  Inmutable
                </span>
              </div>
            </div>
          </div>

          <div class="bg-gray-50 rounded-xl p-3 flex items-start gap-2.5">
            <Icon icon="lucide:info" class="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
            <p class="text-xs text-gray-500 leading-normal">
              Desactivar una cuenta conserva tus registros en el historial. Eliminar borra la cuenta y sus movimientos de forma irreversible.
            </p>
          </div>
        </div>

        <!-- Footer con Acciones de Escape (Regla 21) -->
        <div class="bg-gray-50 border-t border-gray-100 px-6 py-4 shrink-0 flex flex-col gap-2.5">
          <button
            type="button"
            @click="isUpgradeModalOpen = true"
            class="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Icon icon="lucide:sparkles" class="w-4 h-4" />
            Mejorar a Premium (mantener todas mis cuentas)
          </button>

          <div class="flex items-center justify-between pt-1">
            <button
              type="button"
              @click="isLogoutConfirmOpen = true"
              class="text-xs font-medium text-gray-600 hover:text-gray-900 transition flex items-center gap-1.5"
            >
              <Icon icon="lucide:log-out" class="w-3.5 h-3.5" />
              Cerrar sesión
            </button>
            <button
              type="button"
              @click="isDeleteAccountConfirmOpen = true"
              class="text-xs font-medium text-danger hover:underline transition flex items-center gap-1.5"
            >
              <Icon icon="lucide:trash" class="w-3.5 h-3.5" />
              Eliminar cuenta
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Modal Confirmación Hard Delete de Cuenta (Regla 20) -->
  <AppModal
    v-model:open="isHardDeleteModalOpen"
    title="Eliminar cuenta permanentemente"
    :description="accountToHardDelete ? `¿Estás seguro de eliminar '${accountToHardDelete.name}'? Se borrará físicamente junto con todos sus movimientos de forma irreversible.` : ''"
    confirm-label="Eliminar permanentemente"
    cancel-label="Cancelar"
    variant="danger"
    :loading="isHardDeleting"
    @confirm="handleConfirmHardDelete"
    @cancel="isHardDeleteModalOpen = false; accountToHardDelete = null"
  />

  <!-- Modal Confirmación Cerrar Sesión (Regla 21) -->
  <AppModal
    v-model:open="isLogoutConfirmOpen"
    title="Cerrar sesión"
    description="Se cerrará tu sesión en este dispositivo. Podrás volver a ingresar más tarde."
    confirm-label="Cerrar sesión"
    cancel-label="Cancelar"
    variant="warning"
    @confirm="handleLogout"
    @cancel="isLogoutConfirmOpen = false"
  />

  <!-- Modal Confirmación Eliminar Cuenta (Regla 21 / GDPR) -->
  <AppModal
    v-model:open="isDeleteAccountConfirmOpen"
    title="Eliminar cuenta permanentemente"
    description="Esta acción destruirá irreversiblemente tu usuario y todos tus datos en la nube y en este dispositivo. ¿Deseas continuar?"
    confirm-label="Eliminar mi cuenta definitivamente"
    cancel-label="Cancelar"
    variant="danger"
    :loading="isDeletingAccount"
    @confirm="handleDeleteAccount"
    @cancel="isDeleteAccountConfirmOpen = false"
  />

  <!-- Modal Enviar Comprobante Premium (Regla 21) -->
  <AppFormDialog
    v-model:open="isUpgradeModalOpen"
    title="Mejorar a Plan Premium"
    confirm-label="Enviar comprobante"
    cancel-label="Cancelar"
    :loading="isSubmittingUpgrade"
    @confirm="handleSubmitUpgrade"
    @cancel="isUpgradeModalOpen = false"
  >
    <div class="space-y-4">
      <p class="text-xs text-gray-600">
        Con Premium dispones de cuentas ilimitadas y sincronización multidispositivo. Envía tu comprobante para que un administrador verifique el pago (máx. 24h).
      </p>
      <div>
        <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Banco de origen</label>
        <input v-model="upgradeBank" type="text" placeholder="Ej: Banco Pichincha" class="w-full px-3 py-2 rounded-lg border text-sm" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Número de comprobante</label>
        <input v-model="upgradeReceipt" type="text" placeholder="Ej: TRX-998877" class="w-full px-3 py-2 rounded-lg border text-sm" />
      </div>
    </div>
  </AppFormDialog>
</template>
