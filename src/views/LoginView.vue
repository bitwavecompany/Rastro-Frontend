<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/useToastStore'
import { useProfileStore } from '@/stores/useProfileStore'
import { useSessionStore } from '@/stores/useSessionStore'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import { db } from '@/database/db'
import api from '@/api/axios'
import { syncEngine } from '@/sync/SyncEngine'
import { toPlainObject } from '@/utils/clone'
import AppModal from '@/components/ui/AppModal.vue'
import AppFormDialog from '@/components/ui/AppFormDialog.vue'

const router = useRouter()
const toast = useToastStore()
const profileStore = useProfileStore()
const sessionStore = useSessionStore()
const accountsStore = useAccountsStore()
const transactionsStore = useTransactionsStore()

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
const pendingSession = ref<{ token: string; refreshToken?: string; user: any; accountsData: any[]; transactionsData: any[] } | null>(null)

async function handleLogin(force = false) {
  if (!form.value.email || !form.value.password) {
    errorMsg.value = 'Todos los campos son obligatorios'
    return
  }

  isLoading.value = true
  errorMsg.value = ''

  try {
    const payload: any = {
      email: form.value.email.trim(),
      password: form.value.password,
      device_name: 'Web Browser'
    }
    if (force) {
      payload.force = true
    }

    const response = await api.post('/auth/login', payload)
    const { token, refresh_token: refreshToken, user } = response.data.data

    // Consultar datos de la nube con el token obtenido
    const [accountsRes, transactionsRes] = await Promise.all([
      api.get('/accounts', { headers: { Authorization: `Bearer ${token}` } }),
      api.get('/transactions', { headers: { Authorization: `Bearer ${token}` } })
    ])

    const cloudAccounts: any[] = accountsRes.data.data || []
    const cloudTransactions: any[] = transactionsRes.data.data || []

    // Evaluar cuentas activas locales vs cuentas activas en nube (PRD 9.1)
    const localAccounts = await db.accounts.filter(a => !a.deletedAt && !a.deleted_at).toArray()
    const cloudActiveAccounts = cloudAccounts.filter(a => !a.deleted_at && !a.deletedAt)

    // La cuenta por defecto "Efectivo" se fusiona, solo las adicionales ocupan nuevo slot
    const localNonDefault = localAccounts.filter(a => !a.is_default && a.name !== 'Efectivo')
    const totalActiveAccounts = cloudActiveAccounts.length + localNonDefault.length
    const planLimit = user.plan === 'premium' ? Infinity : 3

    if (totalActiveAccounts > planLimit) {
      // Bloquear merge y mostrar modal de colisión
      pendingSession.value = {
        token,
        refreshToken,
        user,
        accountsData: cloudAccounts,
        transactionsData: cloudTransactions
      }
      isCollisionModalOpen.value = true
      return
    }

    // Merge automático permitido
    await completeLoginWithMerge(token, refreshToken, user, cloudAccounts, cloudTransactions)

  } catch (error: any) {
    if (error.response?.status === 409 || error.response?.data?.code === 'SESSION_LIMIT_REACHED') {
      isSessionConflictModalOpen.value = true
    } else if (error.response?.status === 422) {
      const errors = error.response.data.errors
      errorMsg.value = errors ? errors[Object.keys(errors)[0]][0] : error.response.data.message
    } else if (error.response?.status === 401 || error.response?.status === 404) {
      errorMsg.value = 'Credenciales incorrectas'
    } else {
      errorMsg.value = error.response?.data?.message || 'Error al conectar con el servidor'
    }
  } finally {
    isLoading.value = false
  }
}

async function completeLoginWithMerge(token: string, refreshToken: string | undefined, user: any, cloudAccounts: any[], cloudTransactions: any[]) {
  sessionStore.setTokens(token, refreshToken)
  syncEngine.resume()

  await profileStore.setProfileLocally({
    id: String(user.id),
    name: user.name || user.alias,
    email: user.email,
    plan: user.plan || 'free',
    payment_method: user.payment_method,
    payment_bank: user.payment_bank,
    payment_receipt: user.payment_receipt
  })

  let localAccounts = await db.accounts.filter(a => a.syncStatus === 'pending_create').toArray()
  let localTransactions = await db.transactions.filter(t => t.syncStatus === 'pending_create').toArray()

  // Fusionar cuenta por defecto "Efectivo"
  const backendDefault = cloudAccounts.find(a => (a.is_default || a.name === 'Efectivo') && a.type === 'cash')
  const guestDefault = localAccounts.find(a => a.is_default || (a.name === 'Efectivo' && a.type === 'cash'))

  if (backendDefault && guestDefault) {
    // Re-mapear transacciones locales hacia la cuenta cloud
    localTransactions.forEach(t => {
      if (String(t.accountId || t.account_id) === String(guestDefault.id)) {
        t.accountId = backendDefault.id
        t.account_id = backendDefault.id
      }
    })

    // Descartar cuenta Efectivo duplicada del invitado
    localAccounts = localAccounts.filter(a => a.id !== guestDefault.id)

    // Limpiar outbox
    const outboxEntries = await db.outbox.toArray()
    for (const entry of outboxEntries) {
      if (entry.entity === 'accounts' && entry.entityId === guestDefault.id) {
        await db.outbox.delete(entry.seq!)
      }
      if (entry.entity === 'transactions' && (entry.payload?.accountId === guestDefault.id || entry.payload?.account_id === guestDefault.id)) {
        entry.payload.accountId = backendDefault.id
        entry.payload.account_id = backendDefault.id
        await db.outbox.put(entry)
      }
    }
  }

  await db.accounts.clear()
  await db.transactions.clear()

  // 1. Guardar datos del servidor
  if (cloudAccounts.length > 0) {
    await db.accounts.bulkAdd(cloudAccounts.map(a => ({
      ...a,
      amount: Number(a.amount ?? a.initial_balance ?? 0),
      initial_balance: Number(a.initial_balance ?? a.amount ?? 0),
      syncStatus: 'synced'
    })))
  }
  if (cloudTransactions.length > 0) {
    await db.transactions.bulkAdd(cloudTransactions.map(t => ({
      ...t,
      kind: t.kind || t.type,
      type: t.type || t.kind,
      paymentType: t.paymentType || t.payment_method,
      payment_method: t.payment_method || t.paymentType,
      accountId: t.accountId || t.account_id,
      account_id: t.account_id || t.accountId,
      date: t.date || t.createdAt,
      syncStatus: 'synced'
    })))
  }

  // 2. Restaurar datos locales para que se suban al servidor vía SyncEngine
  if (localAccounts.length > 0) {
    for (const a of localAccounts) await db.accounts.put(toPlainObject(a))
  }
  if (localTransactions.length > 0) {
    for (const t of localTransactions) await db.transactions.put(toPlainObject(t))
  }

  await Promise.all([
    accountsStore.load(),
    transactionsStore.load(),
    profileStore.load()
  ])

  toast.success('¡Inicio de sesión exitoso y datos fusionados!')
  router.push('/')
}

// PRD 9.1 - Opción 1: Descartar datos locales
async function handleDiscardLocalData() {
  if (!pendingSession.value) return
  const { token, refreshToken, user, accountsData, transactionsData } = pendingSession.value

  sessionStore.setTokens(token, refreshToken)
  syncEngine.resume()

  await profileStore.setProfileLocally({
    id: String(user.id),
    name: user.name || user.alias,
    email: user.email,
    plan: user.plan || 'free'
  })

  await db.accounts.clear()
  await db.transactions.clear()
  await db.outbox.clear()

  if (accountsData.length > 0) {
    await db.accounts.bulkAdd(accountsData.map(a => ({ ...a, syncStatus: 'synced' })))
  }
  if (transactionsData.length > 0) {
    await db.transactions.bulkAdd(transactionsData.map(t => ({ ...t, syncStatus: 'synced' })))
  }

  await Promise.all([
    accountsStore.load(),
    transactionsStore.load(),
    profileStore.load()
  ])

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
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Error al enviar comprobante')
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