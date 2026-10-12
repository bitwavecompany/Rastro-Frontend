<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/useSessionStore'
import { useProfileStore } from '@/stores/useProfileStore'
import { useToastStore } from '@/stores/useToastStore'
import { authApi } from '@/api/auth'
import AppModal from '@/components/ui/AppModal.vue'

const router = useRouter()
const sessionStore = useSessionStore()
const profileStore = useProfileStore()
const toast = useToastStore()

const isDeleteAccountModalOpen = ref(false)
const deleteConfirmationText = ref('')
const isDeleting = ref(false)

function handleGoToLogin() {
  sessionStore.dismissRemoteRevocation()
  router.push({ path: '/login', query: { fromRevocation: '1' } })
}

function handleOpenDeleteAccount() {
  deleteConfirmationText.value = ''
  isDeleteAccountModalOpen.value = true
}

async function handleDeleteAccountConfirm() {
  if (deleteConfirmationText.value.trim().toUpperCase() !== 'ELIMINAR') {
    toast.error('Debes escribir "ELIMINAR" para confirmar')
    return
  }

  isDeleting.value = true
  try {
    await authApi.deleteAccount()
    toast.success('Cuenta eliminada exitosamente')
    await profileStore.clearAllLocalData()
    sessionStore.dismissRemoteRevocation()
    isDeleteAccountModalOpen.value = false
    router.push('/')
  } catch (err: unknown) {
    const error = err as { response?: { data?: { message?: string } } }
    toast.error(error.response?.data?.message || 'Error al eliminar la cuenta')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="sessionStore.isRevokedRemotely"
      class="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
    >
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <!-- Header -->
        <div class="bg-amber-500/10 border-b border-amber-500/20 px-6 py-5">
          <div class="flex items-center gap-3.5">
            <div class="w-11 h-11 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Icon icon="lucide:smartphone" class="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 class="text-base font-bold text-gray-900 leading-tight">
                Sesión cerrada en este dispositivo
              </h2>
              <p class="text-xs text-amber-700 mt-0.5">
                Acceso transferido
              </p>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-5">
          <p class="text-sm text-gray-700 leading-relaxed font-medium">
            Tu sesión se cerró porque iniciaste sesión en otro dispositivo. Vuelve a iniciar sesión para continuar aquí.
          </p>

          <div class="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-start gap-3">
            <Icon icon="lucide:shield-check" class="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p class="text-xs text-gray-500 leading-normal">
              Tus datos y registros no sincronizados están a salvo en este dispositivo. Al volver a iniciar sesión se sincronizarán normalmente.
            </p>
          </div>

          <!-- Actions -->
          <div class="space-y-2.5 pt-2">
            <button
              type="button"
              @click="handleGoToLogin"
              class="w-full py-3 px-4 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/95 transition shadow-sm flex items-center justify-center gap-2"
            >
              <Icon icon="lucide:log-in" class="w-4 h-4" />
              Iniciar sesión
            </button>

            <button
              type="button"
              @click="handleOpenDeleteAccount"
              class="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-danger/80 hover:text-danger hover:bg-danger/10 transition flex items-center justify-center gap-1.5"
            >
              <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
              Eliminar cuenta permanentemente
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Modal Confirmación Eliminar Cuenta en 2 Pasos -->
  <AppModal
    v-model:open="isDeleteAccountModalOpen"
    title="Eliminar cuenta permanentemente"
    description="Esta acción eliminará físicamente todos tus datos del dispositivo y del servidor. Para confirmar, escribe la palabra ELIMINAR a continuación:"
    confirm-label="Eliminar definitivamente"
    cancel-label="Cancelar"
    variant="danger"
    :confirm-disabled="deleteConfirmationText.trim().toUpperCase() !== 'ELIMINAR' || isDeleting"
    :loading="isDeleting"
    @confirm="handleDeleteAccountConfirm"
  >
    <template #body>
      <div class="px-6 pb-2 space-y-3">
        <p class="text-xs text-danger font-semibold">
          ⚠️ Acción irreversible: todas tus cuentas y movimientos serán borrados sin posibilidad de recuperación.
        </p>
        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Escribe "ELIMINAR" para continuar
          </label>
          <input
            v-model="deleteConfirmationText"
            type="text"
            placeholder="ELIMINAR"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono uppercase focus:ring-2 focus:ring-danger focus:outline-none"
          />
        </div>
      </div>
    </template>
  </AppModal>
</template>
