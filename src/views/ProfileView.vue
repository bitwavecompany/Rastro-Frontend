<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '@/stores/useProfileStore'
import { useSessionStore } from '@/stores/useSessionStore'
import { useToastStore } from '@/stores/useToastStore'
import AppModal from '@/components/ui/AppModal.vue'
import DeadLetterQueueModal from '@/components/sync/DeadLetterQueueModal.vue'
import GuestUpgradePromptModal from '@/components/modals/GuestUpgradePromptModal.vue'
import ProfilePremiumModal from '@/components/profile/ProfilePremiumModal.vue'
import ProfileDeleteAccountModal from '@/components/profile/ProfileDeleteAccountModal.vue'
import packageJson from '../../package.json'
import { authApi } from '@/api/auth'
import { transactionsApi } from '@/api/transactions'

const router = useRouter()
const store = useProfileStore()
const sessionStore = useSessionStore()
const toast = useToastStore()

const isEditingAlias = ref(false)
const isSaving = ref(false)
const aliasForm = ref(store.profile.name)
const aliasError = ref('')
const isDeleteModalOpen = ref(false)
const isDlqModalOpen = ref(false)

const isPremiumModalOpen = ref(false)
const isGuestUpgradeModalOpen = ref(false)
const isPremiumSuccessModalOpen = ref(false)
const isSubmittingPremium = ref(false)

// 2-Step delete account state (PRD 10.2)
const isDeleteAccountModalOpen = ref(false)
const isSubmittingDelete = ref(false)

const isExportingCsv = ref(false)

const isPremium = computed(() => sessionStore.isLoggedIn && store.profile.plan === 'premium')
const isGuest = computed(() => sessionStore.isGuest || store.profile.plan === 'guest')
const isRegistered = computed(() => sessionStore.isLoggedIn && store.profile.plan !== 'premium')

const roleBadge = computed(() => {
  if (isGuest.value) return { label: 'GUEST', classes: 'bg-gray-100 text-gray-600' }
  if (isPremium.value) return { label: 'PRO', classes: 'bg-amber-100 text-amber-700' }
  return { label: 'FREE', classes: 'bg-primary/10 text-primary' }
})

const isPendingVerification = computed(() =>
  sessionStore.isLoggedIn &&
  store.profile.plan === 'free' &&
  Boolean(store.profile.payment_receipt)
)

function startEditingAlias() {
  aliasForm.value = store.profile.name
  aliasError.value = ''
  isEditingAlias.value = true
}

function cancelEditingAlias() {
  isEditingAlias.value = false
}

async function handleSaveAlias() {
  if (!aliasForm.value.trim()) {
    aliasError.value = 'El alias no puede estar vacío'
    return
  }
  isSaving.value = true
  try {
    await store.save({ name: aliasForm.value.trim() })
    toast.success('Alias actualizado')
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } }
    toast.error(err.response?.data?.message || 'Error al actualizar el alias')
  } finally {
    isSaving.value = false
    isEditingAlias.value = false
  }
}

function requestClearData() {
  isDeleteModalOpen.value = true
}

async function confirmClearData() {
  await store.clearAllLocalData()
  isDeleteModalOpen.value = false
  toast.success('Datos locales eliminados')
  router.push('/')
}

function handleRegisterClick() {
  router.push('/register')
}

function handlePremiumClick() {
  if (isGuest.value) {
    isGuestUpgradeModalOpen.value = true
    return
  }
  isPremiumModalOpen.value = true
}

async function handlePremiumSubmit(payload: { bank: string; receipt: string }) {
  isSubmittingPremium.value = true

  try {
    await authApi.requestPremium({
      origin_bank: payload.bank,
      transfer_receipt: payload.receipt,
    })
    // Guardar referencia local para mostrar badge pending_verification
    await store.save({
      payment_method: 'transfer',
      payment_bank: payload.bank,
      payment_receipt: payload.receipt,
    })
    isPremiumModalOpen.value = false
    isPremiumSuccessModalOpen.value = true
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } }
    toast.error(err.response?.data?.message || 'Error al enviar la solicitud')
  } finally {
    isSubmittingPremium.value = false
  }
}

const isLogoutModalOpen = ref(false)

function requestLogout() {
  isLogoutModalOpen.value = true
}

async function handleLogout() {
  try {
    if (!isGuest.value) {
      await authApi.logout()
    }
  } catch (_error: unknown) {
    // Ignorar si el token ya expiró
  } finally {
    await store.clearAllLocalData()
    isLogoutModalOpen.value = false
    toast.success('Sesión cerrada correctamente')
    router.push('/login')
  }
}

function requestDeleteAccount() {
  isDeleteAccountModalOpen.value = true
}

// PRD 10.2: Eliminación en dos pasos (escribir ELIMINAR)
async function handleDeleteAccount() {
  isSubmittingDelete.value = true
  try {
    await authApi.deleteAccount()
    await store.clearAllLocalData()
    toast.success('Cuenta y datos eliminados permanentemente del servidor y del dispositivo')
    isDeleteAccountModalOpen.value = false
    router.push('/')
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } }
    toast.error(err.response?.data?.message || 'Error al eliminar la cuenta')
  } finally {
    isSubmittingDelete.value = false
  }
}

// PRD 2.1 & API Contract 4.3: Exportación CSV exclusiva para Premium
async function handleExportCsv() {
  if (!isPremium.value) {
    toast.warning('La exportación a CSV requiere una suscripción Premium activa.')
    return
  }

  isExportingCsv.value = true
  try {
    const response = await transactionsApi.exportCsv()
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `rastro_transacciones_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    toast.success('Historial exportado exitosamente')
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } }
    toast.error(err.response?.data?.message || 'Error al descargar el archivo CSV')
  } finally {
    isExportingCsv.value = false
  }
}
</script>

<template>
  <div class="min-h-full bg-gray-50 px-6 py-8">
    <div class="space-y-5">

      <div class="flex items-center gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Mi Perfil</h1>
          <p class="text-sm text-gray-400 mt-0.5">Gestiona tu cuenta y suscripción</p>
        </div>
        <span 
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest self-start mt-1"
          :class="roleBadge.classes"
        >
          <Icon v-if="isPremium" icon="lucide:crown" class="w-3 h-3" />
          {{ roleBadge.label }}
        </span>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        <div class="relative bg-gray-900 px-6 py-5 flex items-center justify-between gap-4">
          <div class="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
          <div class="absolute right-10 -bottom-6 w-16 h-16 bg-primary/20 rounded-full blur-xl pointer-events-none"></div>

          <div class="relative z-10 flex items-center gap-4 flex-1 min-w-0">
            <div class="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Icon icon="lucide:user" class="w-5 h-5 text-white/70" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-white truncate">{{ store.profile.name }}</p>
              <p 
                class="text-xs text-white/40 truncate mt-0.5" 
                :class="{'font-mono': !store.profile.email}"
              >
                {{ store.profile.email || store.profile.id }}
              </p>
            </div>
          </div>
        </div>

        <div class="px-6 py-5 space-y-6">

          <!-- PRD 8.1: Estado Pending Verification si el usuario envió comprobante -->
          <div v-if="isPendingVerification" class="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <Icon icon="lucide:clock" class="w-4 h-4" />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-semibold text-blue-900">Solicitud Premium en revisión</h3>
              <p class="text-xs text-blue-700 mt-0.5">
                Tu solicitud fue recibida. La revisaremos en un plazo máximo de 24 horas. Conservas tu plan actual mientras se verifica el pago.
              </p>
              <p class="text-[11px] text-blue-600 mt-2 font-mono">
                Comprobante: {{ store.profile.payment_receipt }}
              </p>
            </div>
          </div>

          <!-- Información de planes según PRD 2.1 -->
          <div class="space-y-3">
            <!-- Plan Invitado -->
            <div v-if="isGuest" class="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon icon="lucide:user" class="w-4 h-4" />
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-gray-900">Modo Invitado (Actual)</h3>
                  <p class="text-xs text-gray-500 mt-0.5">1 cuenta activa (Efectivo). Movimientos ilimitados. Datos almacenados únicamente en este dispositivo.</p>
                </div>
              </div>
            </div>

            <!-- Banner para pasar de Invitado a Registrado -->
            <div v-if="isGuest" class="bg-primary/5 rounded-xl p-4 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Icon icon="lucide:cloud" class="w-4 h-4" />
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-gray-900">Plan Free (Gratuito)</h3>
                  <p class="text-xs text-gray-600 mt-0.5">3 cuentas activas, movimientos ilimitados, historial de 6 meses y sincronización en la nube.</p>
                </div>
              </div>
              <div class="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                <button
                  @click="handleRegisterClick"
                  class="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-colors w-full"
                >
                  Registrarse
                </button>
                <button
                  @click="router.push('/login')"
                  class="px-4 py-2 rounded-lg text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors w-full"
                >
                  Iniciar sesión
                </button>
              </div>
            </div>

            <!-- Plan Free Actual (para usuarios registrados en plan gratuito) -->
            <div v-if="isRegistered" class="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Icon icon="lucide:cloud" class="w-4 h-4" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="text-sm font-semibold text-gray-900">Plan Free (Actual)</h3>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">Activo</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-0.5">3 cuentas activas, movimientos ilimitados, historial de 6 meses y sincronización en la nube.</p>
                </div>
              </div>
            </div>

            <!-- Opción a Premium -->
            <div v-if="isGuest || isRegistered" class="bg-amber-50/30 rounded-xl p-4 border border-amber-200/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon icon="lucide:sparkles" class="w-4 h-4" />
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-gray-900">Mejorar a Premium</h3>
                  <p class="text-xs text-gray-600 mt-0.5">Cuentas ilimitadas, movimientos ilimitados, historial completo sin cortes y exportación a CSV.</p>
                </div>
              </div>
              <button
                @click="handlePremiumClick"
                class="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors w-full sm:w-auto"
              >
                {{ isPendingVerification ? 'Actualizar comprobante' : 'Mejorar a Premium' }}
              </button>
            </div>

            <!-- Usuario ya Premium -->
            <div v-if="isPremium" class="bg-amber-50/50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
               <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                 <Icon icon="lucide:crown" class="w-4 h-4" />
               </div>
               <div>
                 <p class="text-sm font-bold text-amber-900">Eres usuario Premium (Actual)</p>
                 <p class="text-xs text-amber-700/80 mt-0.5">Cuentas ilimitadas, historial completo sin cortes y exportación activa.</p>
               </div>
            </div>
          </div>

          <!-- Opciones de cuenta y acciones -->
          <div v-if="!isEditingAlias" class="space-y-2">
            <button
              @click="startEditingAlias"
              class="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <Icon icon="lucide:pencil" class="w-4 h-4 text-gray-400" />
                Personalizar alias
              </div>
              <Icon icon="lucide:chevron-right" class="w-4 h-4 text-gray-300" />
            </button>

            <!-- Exportar CSV (PRD 2.1) -->
            <button
              @click="handleExportCsv"
              :disabled="isExportingCsv"
              class="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <Icon icon="lucide:file-spreadsheet" class="w-4 h-4" :class="isPremium ? 'text-amber-600' : 'text-gray-400'" />
                <span>Exportar historial a CSV</span>
                <span v-if="!isPremium" class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase">PRO</span>
              </div>
              <Icon icon="lucide:download" class="w-4 h-4 text-gray-400" :class="{'animate-bounce': isExportingCsv}" />
            </button>

            <!-- Bandeja de errores de sincronización (DLQ - PRD 7.3) -->
            <button
              v-if="!isGuest"
              @click="isDlqModalOpen = true"
              class="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <Icon icon="lucide:alert-triangle" class="w-4 h-4 text-gray-400" />
                Bandeja de errores de sincronización
              </div>
              <Icon icon="lucide:chevron-right" class="w-4 h-4 text-gray-300" />
            </button>

            <button
              v-if="isGuest"
              @click="requestClearData"
              class="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-danger/20 bg-danger/5 text-sm font-medium text-danger/90 hover:bg-danger/10 transition-colors"
            >
              <div class="flex items-center gap-3">
                <Icon icon="lucide:trash-2" class="w-4 h-4 text-danger/70" />
                Eliminar datos locales
              </div>
              <Icon icon="lucide:chevron-right" class="w-4 h-4 text-danger/30" />
            </button>

            <button
              v-if="!isGuest"
              @click="requestLogout"
              class="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <Icon icon="lucide:log-out" class="w-4 h-4 text-gray-400" />
                Cerrar sesión
              </div>
              <Icon icon="lucide:chevron-right" class="w-4 h-4 text-gray-300" />
            </button>

            <button
              v-if="!isGuest"
              @click="requestDeleteAccount"
              class="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-danger/20 bg-danger/5 text-sm font-medium text-danger/90 hover:bg-danger/10 transition-colors"
            >
              <div class="flex items-center gap-3">
                <Icon icon="lucide:user-x" class="w-4 h-4 text-danger/70" />
                Eliminar cuenta
              </div>
              <Icon icon="lucide:chevron-right" class="w-4 h-4 text-danger/30" />
            </button>
          </div>

          <!-- Edición de alias -->
          <div v-else class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Nuevo alias
              </label>
              <input
                v-model="aliasForm"
                type="text"
                placeholder="Ej: Mi Negocio"
                :disabled="isSaving"
                class="w-full px-3 py-2.5 rounded-lg border text-sm text-gray-900 placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-primary/100 focus:border-transparent
                       disabled:bg-gray-50 disabled:text-gray-400 transition"
                :class="aliasError ? 'border-danger/60 bg-danger/10' : 'border-gray-300'"
              />
              <p v-if="aliasError" class="mt-1 text-xs text-danger/80">{{ aliasError }}</p>
            </div>
            <div class="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                @click="cancelEditingAlias"
                :disabled="isSaving"
                class="w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200
                       text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                @click="handleSaveAlias"
                :disabled="isSaving"
                class="w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white
                       hover:bg-primary/90 active:bg-primary/80 transition-colors
                       disabled:opacity-60"
              >
                {{ isSaving ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </div>

        </div>
      </div>

      <div class="flex flex-col items-center justify-center gap-1.5 pt-6 pb-4">
        <img
          src="/imagotipo-blanco-big.jpg"
          alt="Rastro"
          class="h-6 w-auto object-contain opacity-40 grayscale"
        />
        <span class="text-[10px] font-medium text-gray-400 tracking-wider">
          v{{ packageJson.version }}
        </span>
      </div>

    </div>
  </div>

  <!-- Modal Borrar Datos Locales (Guest) -->
  <AppModal
    v-model:open="isDeleteModalOpen"
    title="Eliminar datos locales"
    description="¿Estás seguro de borrar todos tus datos en este dispositivo? Se destruirá la base de datos local y esta acción es completamente irreversible."
    confirm-label="Eliminar datos"
    cancel-label="Cancelar"
    variant="danger"
    @confirm="confirmClearData"
  />

  <!-- Modal Cerrar Sesión -->
  <AppModal
    v-model:open="isLogoutModalOpen"
    title="Cerrar sesión"
    description="¿Deseas cerrar sesión? Se limpiará la caché local del dispositivo. Tus datos en la nube permanecerán seguros y se descargarán cuando vuelvas a iniciar sesión."
    confirm-label="Cerrar sesión"
    cancel-label="Cancelar"
    variant="danger"
    @confirm="handleLogout"
  />

  <!-- PRD 10.2: Modal Eliminar Cuenta en 2 Pasos (Escribir ELIMINAR) -->
  <ProfileDeleteAccountModal
    v-model:open="isDeleteAccountModalOpen"
    :loading="isSubmittingDelete"
    @confirm="handleDeleteAccount"
  />

  <!-- Formulario Solicitud Premium (PRD 8.1) -->
  <ProfilePremiumModal
    v-model:open="isPremiumModalOpen"
    :loading="isSubmittingPremium"
    @submit="handlePremiumSubmit"
  />

  <!-- PRD 8.1: Modal confirmación de recepción de solicitud -->
  <AppModal
    v-model:open="isPremiumSuccessModalOpen"
    title="Solicitud recibida"
    description="Tu solicitud fue recibida. La revisaremos en un plazo máximo de 24 horas."
    confirm-label="Entendido"
    variant="default"
    @confirm="isPremiumSuccessModalOpen = false"
  />

  <!-- Modal Bandeja de Errores DLQ -->
  <DeadLetterQueueModal v-model:open="isDlqModalOpen" />

  <!-- Modal Requerimiento de Cuenta para Invitado antes de solicitar Premium -->
  <GuestUpgradePromptModal v-model:open="isGuestUpgradeModalOpen" />
</template>