<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/useToastStore'
import { authApi } from '@/api/auth'
import { authMergeService, type AuthUser, type CloudAccountRaw, type CloudTransactionRaw } from '@/services/authMergeService'
import api from '@/api/axios'
import AppModal from '@/components/ui/AppModal.vue'
import AppFormDialog from '@/components/ui/AppFormDialog.vue'

const router = useRouter()
const toast = useToastStore()

const form = ref({ email: '', password: '' })
const isLoading = ref(false)
const errorMsg = ref('')

// PRD 10.3 / Regla 13: Bloqueo de sesión simultánea en Free
const isSessionConflictModalOpen = ref(false)
const isForceConfirmModalOpen = ref(false)
const isUpgradeInfoModalOpen = ref(false)

// PRD 9.1: Modal de colisión de fusión al iniciar sesión
const isCollisionModalOpen = ref(false)
const isPremiumUpgradeModalOpen = ref(false)
const isSubmittingUpgrade = ref(false)
const premiumBank = ref('')
const premiumReceipt = ref('')
const pendingSession = ref<{
  token: string
  refreshToken?: string
  user: AuthUser
  accountsData: CloudAccountRaw[]
  transactionsData: CloudTransactionRaw[]
} | null>(null)

async function handleLogin(force = false) {
  if (!form.value.email || !form.value.password) {
    errorMsg.value = 'Todos los campos son obligatorios'
    return
  }

  isLoading.value = true
  errorMsg.value = ''

  try {
    const response = await authApi.login({
      email: form.value.email.trim(),
      password: form.value.password,
      device_name: 'Web Browser',
      force,
    })

    const { token, refresh_token: refreshToken, user } = response.data.data

    // Consultar datos de la nube con el token obtenido
    const [accountsRes, transactionsRes] = await Promise.all([
      api.get('/accounts', { headers: { Authorization: `Bearer ${token}` } }),
      api.get('/transactions', { headers: { Authorization: `Bearer ${token}` } })
    ])

    const cloudAccounts: CloudAccountRaw[] = (accountsRes.data.data as CloudAccountRaw[]) || []
    const cloudTransactions: CloudTransactionRaw[] = (transactionsRes.data.data as CloudTransactionRaw[]) || []

    const collision = await authMergeService.checkLoginCollision({
      user,
      cloudAccounts,
    })

    if (collision.hasCollision) {
      pendingSession.value = {
        token,
        refreshToken,
        user,
        accountsData: cloudAccounts,
        transactionsData: cloudTransactions,
      }
      isCollisionModalOpen.value = true
      return
    }

    // Merge automático permitido
    await authMergeService.completeLoginWithMerge({
      token,
      refreshToken,
      user,
      cloudAccounts,
      cloudTransactions,
    })

    toast.success('¡Inicio de sesión exitoso y datos fusionados!')
    router.push('/')

  } catch (error: unknown) {
    const err = error as {
      response?: {
        status?: number
        data?: {
          code?: string
          message?: string
          errors?: Record<string, string[]>
        }
      }
    }
    if (err.response?.status === 409 || err.response?.data?.code === 'SESSION_LIMIT_REACHED') {
      isSessionConflictModalOpen.value = true
    } else if (err.response?.status === 422) {
      const errors = err.response.data?.errors
      errorMsg.value = errors ? errors[Object.keys(errors)[0]][0] : (err.response?.data?.message || 'Error de validación')
    } else if (err.response?.status === 401 || err.response?.status === 404) {
      errorMsg.value = 'Credenciales incorrectas'
    } else {
      errorMsg.value = err.response?.data?.message || 'Error al conectar con el servidor'
    }
  } finally {
    isLoading.value = false
  }
}

// PRD 9.1 - Opción 1: Descartar datos locales
async function handleDiscardLocalData() {
  if (!pendingSession.value) return
  await authMergeService.discardLocalData(pendingSession.value)
  isCollisionModalOpen.value = false
  pendingSession.value = null
  toast.success('Iniciaste sesión con los datos de la nube')
  router.push('/')
}

// PRD 10.3 / Regla 13: Handlers de conflicto de sesión simultánea en Free
function handleStartForceLogin() {
  isSessionConflictModalOpen.value = false
  isForceConfirmModalOpen.value = true
}

function handleConfirmForceLogin() {
  isForceConfirmModalOpen.value = false
  handleLogin(true)
}

// PRD 9.1 - Opción 2: Mejorar a Premium desde el modal de colisión
function handleOpenPremiumFromCollision() {
  isCollisionModalOpen.value = false
  isPremiumUpgradeModalOpen.value = true
}

async function handleSubmitPremiumFromCollision() {
  if (!premiumBank.value.trim() || !premiumReceipt.value.trim()) {
    toast.error('Todos los campos son obligatorios')
    return
  }

  if (!pendingSession.value) return

  isSubmittingUpgrade.value = true
  try {
    await api.post('/auth/upgrade-request', {
      origin_bank: premiumBank.value.trim(),
      transfer_receipt: premiumReceipt.value.trim()
    }, {
      headers: { Authorization: `Bearer ${pendingSession.value.token}` }
    })

    toast.info('Tu solicitud fue recibida. Permaneces como Invitado mientras se verifica el pago.', 6000)
    isPremiumUpgradeModalOpen.value = false
    pendingSession.value = null
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } }
    toast.error(err.response?.data?.message || 'Error al enviar comprobante')
  } finally {
    isSubmittingUpgrade.value = false
  }
}

// PRD 9.1 - Opción 3: Cancelar
function handleCancelCollision() {
  isCollisionModalOpen.value = false
  pendingSession.value = null
  toast.info('Inicio de sesión cancelado. Tus datos locales se conservan.')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <div class="px-4 py-4 flex items-center">
      <button @click="router.push('/profile')" type="button" class="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-200 transition-colors">
        <Icon icon="lucide:arrow-left" class="w-5 h-5" />
      </button>
    </div>

    <div class="flex-1 flex flex-col justify-center px-6 pb-20 max-w-md w-full mx-auto">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Iniciar sesión</h1>
        <p class="text-sm text-gray-500 mt-2">Bienvenido de vuelta. Ingresa a tu cuenta para continuar.</p>
      </div>

      <div v-if="errorMsg" class="mb-5 flex items-start gap-2 bg-danger/10 border border-danger/30 text-danger/90 text-sm rounded-lg px-4 py-3">
        <Icon icon="lucide:circle-alert" class="w-4 h-4 mt-0.5 shrink-0" />
        {{ errorMsg }}
      </div>

      <form @submit.prevent="() => handleLogin(false)" class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
          <input v-model="form.email" type="email" placeholder="correo@ejemplo.com" :disabled="isLoading" class="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary/100 outline-none transition disabled:opacity-60" />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Contraseña</label>
          <input v-model="form.password" type="password" placeholder="Tu contraseña secreta" :disabled="isLoading" class="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary/100 outline-none transition disabled:opacity-60" />
        </div>

        <button type="submit" :disabled="isLoading" class="w-full mt-4 bg-gray-900 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-gray-800 active:bg-gray-700 transition disabled:opacity-70">
          {{ isLoading ? 'Validando credenciales...' : 'Ingresar' }}
        </button>
      </form>
      
      <div class="mt-8 text-center">
        <p class="text-sm text-gray-500">
          ¿No tienes una cuenta? 
          <button @click="router.push('/register')" class="text-primary font-semibold hover:underline">Regístrate aquí</button>
        </p>
      </div>
    </div>
  </div>

  <!-- PRD 9.1: Modal de Colisión de Límite al Iniciar Sesión -->
  <AppModal
    v-model:open="isCollisionModalOpen"
    title="Límite de cuentas alcanzado"
    description="Al combinar tus datos locales con los de tu cuenta registrada, superarías el límite de 3 cuentas activas de tu plan Free."
    confirm-label="Descartar datos locales"
    cancel-label="Cancelar"
    variant="danger"
    @confirm="handleDiscardLocalData"
    @cancel="handleCancelCollision"
  >
    <template #body>
      <div class="px-6 pb-4 space-y-4 text-xs text-gray-600">
        <p>Elige una opción para continuar:</p>
        <div class="space-y-2">
          <div class="p-3 bg-red-50 rounded-xl border border-red-200">
            <p class="font-bold text-red-900">1. Descartar datos locales</p>
            <p class="text-red-700 mt-0.5">Se eliminan los datos creados en este teléfono y entras solo con tus datos de la nube.</p>
          </div>
          <div class="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <p class="font-bold text-amber-900">2. Mejorar a Premium</p>
            <p class="text-amber-700 mt-0.5">Permite cuentas ilimitadas. Envía tu comprobante y permanece como Invitado mientras se aprueba.</p>
            <button
              type="button"
              @click="handleOpenPremiumFromCollision"
              class="mt-2 w-full py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition text-xs"
            >
              Enviar comprobante Premium
            </button>
          </div>
        </div>
      </div>
    </template>
  </AppModal>

  <!-- Modal Comprobante Premium desde Colisión -->
  <AppFormDialog
    v-model:open="isPremiumUpgradeModalOpen"
    title="Solicitud Premium para fusión"
    confirm-label="Enviar comprobante"
    cancel-label="Cancelar"
    :loading="isSubmittingUpgrade"
    @confirm="handleSubmitPremiumFromCollision"
    @cancel="isPremiumUpgradeModalOpen = false"
  >
    <div class="space-y-4">
      <p class="text-xs text-gray-600">
        Ingresa los datos de tu transferencia. Conservarás todos tus datos locales intactos como Invitado mientras la solicitud es verificada por un administrador (máx. 24h).
      </p>
      <div>
        <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Banco de origen</label>
        <input v-model="premiumBank" type="text" placeholder="Ej: Banco Pichincha" class="w-full px-3 py-2 rounded-lg border text-sm" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Número de comprobante</label>
        <input v-model="premiumReceipt" type="text" placeholder="Ej: TRX-998877" class="w-full px-3 py-2 rounded-lg border text-sm" />
      </div>
    </div>
  </AppFormDialog>

  <!-- PRD 10.3 / Regla 13: Modal de Conflicto de Sesión Simultánea (Free) -->
  <AppModal
    v-model:open="isSessionConflictModalOpen"
    title="Sesión activa en otro dispositivo"
    description="Ya tienes una sesión activa en otro dispositivo. Cierra esa sesión para continuar aquí, o mejora a Premium para usar Rastro en todos tus dispositivos."
    confirm-label="Cerrar sesión en el otro dispositivo"
    cancel-label="Cancelar"
    variant="warning"
    @confirm="handleStartForceLogin"
    @cancel="isSessionConflictModalOpen = false"
  >
    <template #body>
      <div class="px-6 pb-4 space-y-3">
        <button
          type="button"
          @click="isSessionConflictModalOpen = false; isUpgradeInfoModalOpen = true"
          class="w-full py-2.5 px-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold hover:bg-amber-100 transition flex items-center justify-center gap-2"
        >
          <Icon icon="lucide:sparkles" class="w-4 h-4 text-amber-600" />
          Mejorar a Premium para usar todos tus dispositivos
        </button>
      </div>
    </template>
  </AppModal>

  <!-- PRD 10.3: Confirmación de cierre de sesión remoto -->
  <AppModal
    v-model:open="isForceConfirmModalOpen"
    title="Confirmar cierre de sesión remoto"
    description="Al iniciar sesión aquí se cerrará tu sesión en el otro dispositivo activo."
    confirm-label="Cerrar otra sesión y continuar"
    cancel-label="Cancelar"
    variant="danger"
    @confirm="handleConfirmForceLogin"
    @cancel="isForceConfirmModalOpen = false"
  />

  <!-- Modal Informativo de Mejora a Premium -->
  <AppModal
    v-model:open="isUpgradeInfoModalOpen"
    title="Acceso multidispositivo con Premium"
    description="El plan Premium te permite usar Rastro en dispositivos ilimitados simultáneamente. Para mejorar tu plan, puedes iniciar sesión en tu dispositivo activo para enviar tu comprobante, o cerrar la sesión en el otro dispositivo para continuar desde aquí."
    confirm-label="Cerrar sesión en el otro dispositivo"
    cancel-label="Cerrar"
    variant="default"
    @confirm="isUpgradeInfoModalOpen = false; handleStartForceLogin()"
    @cancel="isUpgradeInfoModalOpen = false"
  />
</template>