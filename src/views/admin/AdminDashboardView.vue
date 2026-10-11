<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '@/api/admin'
import { useToastStore } from '@/stores/useToastStore'
import AppModal from '@/components/ui/AppModal.vue'
import type { PremiumRequest, Profile } from '@/types/profile'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'

dayjs.extend(relativeTime)
dayjs.locale('es')

const router = useRouter()
const toast = useToastStore()

// State
const activeTab = ref<'users' | 'requests'>('users')
const users = ref<Profile[]>([])
const premiumRequests = ref<PremiumRequest[]>([])
const isLoadingUsers = ref(false)
const isLoadingRequests = ref(false)

// Modals state
const confirmModalOpen = ref(false)
const selectedUser = ref<Profile | null>(null)
const pendingAction = ref<'premium' | 'free' | null>(null)

// In-person cash payment modal
const cashModalOpen = ref(false)
const cashUser = ref<Profile | null>(null)
const cashNotes = ref('')
const cashNotesError = ref('')
const isSubmittingCash = ref(false)

// Reject request modal
const rejectModalOpen = ref(false)
const selectedRequest = ref<PremiumRequest | null>(null)
const rejectionReason = ref('')
const rejectionReasonError = ref('')
const isSubmittingReject = ref(false)

// Stats
const pendingRequestsCount = computed(() => {
  return premiumRequests.value.filter(r => r.status === 'pending_verification').length
})
const premiumUsersCount = computed(() => {
  return users.value.filter(u => u.plan === 'premium').length
})

async function fetchUsers() {
  try {
    isLoadingUsers.value = true
    const { data } = await adminApi.getUsers()
    // Handle both direct array or pagination envelope { data: { results: [...] } }
    if (Array.isArray(data.data)) {
      users.value = data.data
    } else if (Array.isArray(data.data?.results)) {
      users.value = data.data.results
    } else if (Array.isArray(data)) {
      users.value = data
    } else {
      users.value = []
    }
  } catch (error: any) {
    handleApiAuthError(error, 'Error al cargar usuarios')
  } finally {
    isLoadingUsers.value = false
  }
}

async function fetchPremiumRequests() {
  try {
    isLoadingRequests.value = true
    const { data } = await adminApi.getPremiumRequests()
    if (Array.isArray(data.data)) {
      premiumRequests.value = data.data
    } else if (Array.isArray(data.data?.results)) {
      premiumRequests.value = data.data.results
    } else if (Array.isArray(data)) {
      premiumRequests.value = data
    } else {
      premiumRequests.value = []
    }
  } catch (error: any) {
    handleApiAuthError(error, 'Error al cargar solicitudes premium')
  } finally {
    isLoadingRequests.value = false
  }
}

function handleApiAuthError(error: any, defaultMsg: string) {
  if (error.response?.status === 401 || error.response?.status === 403) {
    toast.error('Sesión caducada o sin permisos de administrador')
    router.push('/admin/login')
  } else {
    toast.error(error.response?.data?.message || defaultMsg)
  }
}

onMounted(() => {
  fetchUsers()
  fetchPremiumRequests()
})

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return dayjs(iso).locale('es').format('DD MMM YYYY HH:mm').toLowerCase()
}

function timeAgo(iso?: string | null) {
  if (!iso) return ''
  return dayjs(iso).fromNow()
}

// --- Toggle Plan ---
function requestPlanToggle(user: Profile) {
  selectedUser.value = user
  pendingAction.value = user.plan === 'premium' ? 'free' : 'premium'
  confirmModalOpen.value = true
}

async function handleConfirmToggle() {
  if (!selectedUser.value || !pendingAction.value) return

  try {
    const payload = pendingAction.value === 'free'
      ? { plan: 'free' as const }
      : {
          plan: 'premium' as const,
          payment_method: selectedUser.value.payment_method || undefined,
          payment_bank: selectedUser.value.payment_bank || undefined,
          payment_receipt: selectedUser.value.payment_receipt || undefined,
        }

    const { data } = await adminApi.togglePlan(selectedUser.value.id, payload)
    const updated = data.data || data
    const idx = users.value.findIndex(u => u.id === selectedUser.value?.id)
    if (idx !== -1) {
      users.value[idx] = updated
    }
    if (pendingAction.value === 'premium') {
      toast.success(`Plan actualizado a PREMIUM. Correo de activación (PremiumActivatedMail) enviado al usuario.`)
    } else {
      toast.success(`Plan cambiado a FREE. Correo de notificación (PlanDowngradedMail) enviado al usuario.`)
    }
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Error al cambiar el plan')
  } finally {
    confirmModalOpen.value = false
    selectedUser.value = null
    pendingAction.value = null
  }
}

// --- Manual In-Person Cash Payment ---
function openCashModal(user: Profile) {
  cashUser.value = user
  cashNotes.value = `Pago presencial en efectivo registrado el ${dayjs().locale('es').format('DD MMM YYYY').toLowerCase()}`
  cashNotesError.value = ''
  cashModalOpen.value = true
}

async function handleConfirmCashPayment() {
  if (!cashUser.value) return
  if (!cashNotes.value.trim()) {
    cashNotesError.value = 'Las notas de pago son obligatorias'
    return
  }

  try {
    isSubmittingCash.value = true
    const { data } = await adminApi.manualUpgrade(cashUser.value.id, {
      payment_notes: cashNotes.value.trim(),
    })
    const updated = data.data || data
    const idx = users.value.findIndex(u => u.id === cashUser.value?.id)
    if (idx !== -1) {
      users.value[idx] = { ...users.value[idx], ...updated, plan: 'premium' }
    }
    toast.success('Pago en efectivo registrado. Usuario actualizado a Premium y correo de activación enviado.')
    cashModalOpen.value = false
    cashUser.value = null
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Error al registrar pago en efectivo')
  } finally {
    isSubmittingCash.value = false
  }
}

// --- Approve Premium Request ---
async function handleApproveRequest(req: PremiumRequest) {
  try {
    await adminApi.approvePremiumRequest(req.id)
    toast.success('Solicitud aprobada con éxito. Usuario promovido a Premium y correo de activación (PremiumActivatedMail) enviado.')
    // Actualizar estado localmente
    req.status = 'approved'
    req.verified_at = new Date().toISOString()
    // Refrescar usuarios en segundo plano
    fetchUsers()
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Error al aprobar solicitud')
  }
}

// --- Reject Premium Request ---
function openRejectModal(req: PremiumRequest) {
  selectedRequest.value = req
  rejectionReason.value = ''
  rejectionReasonError.value = ''
  rejectModalOpen.value = true
}

async function handleConfirmReject() {
  if (!selectedRequest.value) return
  if (!rejectionReason.value.trim()) {
    rejectionReasonError.value = 'El motivo de rechazo es obligatorio (PRD 8.3)'
    return
  }

  try {
    isSubmittingReject.value = true
    await adminApi.rejectPremiumRequest(selectedRequest.value.id, {
      rejection_reason: rejectionReason.value.trim(),
    })
    toast.success('Solicitud rechazada. Correo de notificación con motivo (PremiumRejectedMail) enviado al cliente.')
    selectedRequest.value.status = 'rejected'
    selectedRequest.value.rejection_reason = rejectionReason.value.trim()
    rejectModalOpen.value = false
    selectedRequest.value = null
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Error al rechazar solicitud')
  } finally {
    isSubmittingReject.value = false
  }
}

function handleLogout() {
  localStorage.removeItem('auth_token')
  router.push('/admin/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Header Admin -->
    <header class="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
          <Icon icon="lucide:shield-check" class="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 class="text-lg font-bold tracking-tight">Rastro Admin</h1>
          <p class="text-xs text-gray-400">Portal de Operaciones y Suscripciones (PRD v1.0)</p>
        </div>
      </div>
      <button 
        @click="handleLogout"
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm font-medium"
      >
        <Icon icon="lucide:log-out" class="w-4 h-4" />
        Cerrar Sesión
      </button>
    </header>

    <!-- Main Content -->
    <main class="flex-1 p-6 overflow-x-auto">
      <div class="max-w-7xl mx-auto space-y-6">

        <!-- Metrics cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon icon="lucide:users" class="w-6 h-6 text-primary" />
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Clientes</p>
              <p class="text-2xl font-bold text-gray-900 mt-0.5">{{ users.length }}</p>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Icon icon="lucide:crown" class="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Usuarios Premium</p>
              <p class="text-2xl font-bold text-amber-600 mt-0.5">{{ premiumUsersCount }}</p>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Icon icon="lucide:clock" class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Solicitudes Pendientes</p>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-2xl font-bold text-gray-900">{{ pendingRequestsCount }}</span>
                <span
                  v-if="pendingRequestsCount > 0"
                  class="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700 animate-pulse"
                >
                  Por revisar
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center justify-between border-b border-gray-200">
          <div class="flex gap-4">
            <button
              type="button"
              @click="activeTab = 'users'"
              class="pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all cursor-pointer"
              :class="activeTab === 'users'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'"
            >
              <Icon icon="lucide:users" class="w-4 h-4" />
              Clientes Registrados
              <span class="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                {{ users.length }}
              </span>
            </button>

            <button
              type="button"
              @click="activeTab = 'requests'"
              class="pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all cursor-pointer"
              :class="activeTab === 'requests'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'"
            >
              <Icon icon="lucide:inbox" class="w-4 h-4" />
              Cola de Solicitudes Premium
              <span
                v-if="pendingRequestsCount > 0"
                class="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 font-bold"
              >
                {{ pendingRequestsCount }}
              </span>
            </button>
          </div>

          <button
            @click="activeTab === 'users' ? fetchUsers() : fetchPremiumRequests()"
            class="text-sm font-medium text-primary flex items-center gap-1.5 hover:underline pb-3 cursor-pointer"
          >
            <Icon
              icon="lucide:refresh-cw"
              class="w-4 h-4"
              :class="{ 'animate-spin': activeTab === 'users' ? isLoadingUsers : isLoadingRequests }"
            />
            Actualizar
          </button>
        </div>

        <!-- TAB 1: CLIENTES REGISTRADOS -->
        <div v-if="activeTab === 'users'" class="space-y-4">
          <div v-if="isLoadingUsers && users.length === 0" class="py-20 text-center">
            <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p class="text-gray-500 mt-4 text-sm">Cargando clientes...</p>
          </div>

          <div v-else class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                <thead>
                  <tr class="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs tracking-wider">
                    <th class="px-6 py-4 font-semibold">Cliente</th>
                    <th class="px-6 py-4 font-semibold">Plan Actual</th>
                    <th class="px-6 py-4 font-semibold">Datos de Pago / Origen</th>
                    <th class="px-6 py-4 font-semibold">Registro</th>
                    <th class="px-6 py-4 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-if="users.length === 0">
                    <td colspan="5" class="px-6 py-10 text-center text-gray-500">
                      No hay clientes registrados en el sistema.
                    </td>
                  </tr>
                  <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50/50 transition">
                    <!-- Cliente -->
                    <td class="px-6 py-4">
                      <p class="font-bold text-gray-900">{{ user.name }}</p>
                      <p class="text-xs text-gray-500 mt-0.5">{{ user.email }}</p>
                    </td>

                    <!-- Plan -->
                    <td class="px-6 py-4">
                      <span 
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
                        :class="user.plan === 'premium' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-600 border border-gray-200'"
                      >
                        <Icon v-if="user.plan === 'premium'" icon="lucide:crown" class="w-3 h-3" />
                        {{ user.plan }}
                      </span>
                    </td>

                    <!-- Datos de Pago -->
                    <td class="px-6 py-4">
                      <div v-if="user.payment_method" class="space-y-1">
                        <p class="text-xs text-gray-700">
                          <span class="font-semibold text-gray-500">Método:</span> 
                          {{ user.payment_method === 'transfer' ? 'Transferencia' : 'Efectivo' }}
                        </p>
                        <p v-if="user.payment_bank" class="text-xs text-gray-700">
                          <span class="font-semibold text-gray-500">Banco:</span> {{ user.payment_bank }}
                        </p>
                        <p v-if="user.payment_receipt" class="text-xs text-gray-700">
                          <span class="font-semibold text-gray-500">Comprobante:</span> 
                          <span class="font-mono bg-gray-100 px-1 py-0.5 rounded">{{ user.payment_receipt }}</span>
                        </p>
                      </div>
                      <span v-else class="text-xs text-gray-400 italic">Sin datos registrados</span>
                    </td>

                    <!-- Fecha -->
                    <td class="px-6 py-4 text-xs text-gray-500">
                      {{ formatDate(user.created_at) }}
                    </td>

                    <!-- Acciones -->
                    <td class="px-6 py-4">
                      <div class="flex items-center justify-center gap-3">
                        <!-- Toggle Switch -->
                        <div class="flex items-center gap-1.5" title="Cambiar plan manual">
                          <button 
                            @click="requestPlanToggle(user)"
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                            :class="user.plan === 'premium' ? 'bg-amber-500' : 'bg-gray-200'"
                          >
                            <span class="sr-only">Toggle Plan</span>
                            <span 
                              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm"
                              :class="user.plan === 'premium' ? 'translate-x-6' : 'translate-x-1'"
                            />
                          </button>
                          <span class="text-[11px] font-semibold text-gray-500 uppercase">{{ user.plan }}</span>
                        </div>

                        <!-- Botón Pago en Efectivo -->
                        <button
                          v-if="user.plan !== 'premium'"
                          type="button"
                          @click="openCashModal(user)"
                          class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 transition cursor-pointer"
                          title="Registrar pago presencial en efectivo"
                        >
                          <Icon icon="lucide:banknote" class="w-3.5 h-3.5 text-emerald-600" />
                          Pago Efectivo
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 2: COLA DE SOLICITUDES PREMIUM -->
        <div v-if="activeTab === 'requests'" class="space-y-4">
          <div v-if="isLoadingRequests && premiumRequests.length === 0" class="py-20 text-center">
            <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p class="text-gray-500 mt-4 text-sm">Cargando solicitudes...</p>
          </div>

          <div v-else class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                <thead>
                  <tr class="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs tracking-wider">
                    <th class="px-6 py-4 font-semibold">Cliente</th>
                    <th class="px-6 py-4 font-semibold">Banco Origen</th>
                    <th class="px-6 py-4 font-semibold">Nro. Comprobante</th>
                    <th class="px-6 py-4 font-semibold">Fecha y Tiempo Transcurrido</th>
                    <th class="px-6 py-4 font-semibold">Estado</th>
                    <th class="px-6 py-4 font-semibold text-center">Decisión Admin</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-if="premiumRequests.length === 0">
                    <td colspan="6" class="px-6 py-10 text-center text-gray-500">
                      No hay solicitudes en la cola.
                    </td>
                  </tr>
                  <tr v-for="req in premiumRequests" :key="req.id" class="hover:bg-gray-50/50 transition">
                    <!-- Cliente -->
                    <td class="px-6 py-4">
                      <p class="font-bold text-gray-900">{{ req.user?.name || `Usuario ID: ${req.user_id}` }}</p>
                      <p class="text-xs text-gray-500 mt-0.5">{{ req.user?.email || '—' }}</p>
                    </td>

                    <!-- Banco -->
                    <td class="px-6 py-4 font-medium text-gray-800">
                      {{ req.origin_bank || '—' }}
                    </td>

                    <!-- Comprobante -->
                    <td class="px-6 py-4">
                      <span class="font-mono bg-gray-100 px-2 py-1 rounded text-xs text-gray-800 font-semibold border border-gray-200">
                        {{ req.transfer_receipt || '—' }}
                      </span>
                    </td>

                    <!-- Fecha y Tiempo -->
                    <td class="px-6 py-4 text-xs text-gray-500">
                      <p class="font-medium text-gray-700">{{ formatDate(req.created_at) }}</p>
                      <p class="text-gray-400 mt-0.5">Hace {{ timeAgo(req.created_at) }}</p>
                    </td>

                    <!-- Estado -->
                    <td class="px-6 py-4">
                      <span
                        class="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"
                        :class="{
                          'bg-amber-100 text-amber-800': req.status === 'pending_verification',
                          'bg-emerald-100 text-emerald-800': req.status === 'approved',
                          'bg-rose-100 text-rose-800': req.status === 'rejected',
                        }"
                      >
                        <span class="w-1.5 h-1.5 rounded-full" :class="{
                          'bg-amber-500': req.status === 'pending_verification',
                          'bg-emerald-500': req.status === 'approved',
                          'bg-rose-500': req.status === 'rejected',
                        }"></span>
                        {{ req.status === 'pending_verification' ? 'Pendiente' : (req.status === 'approved' ? 'Aprobada' : 'Rechazada') }}
                      </span>
                      <p v-if="req.rejection_reason" class="text-[11px] text-rose-600 mt-1 max-w-xs truncate" :title="req.rejection_reason">
                        Motivo: {{ req.rejection_reason }}
                      </p>
                    </td>

                    <!-- Acciones -->
                    <td class="px-6 py-4">
                      <div v-if="req.status === 'pending_verification'" class="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          @click="handleApproveRequest(req)"
                          class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition flex items-center gap-1 cursor-pointer"
                        >
                          <Icon icon="lucide:check" class="w-3.5 h-3.5" />
                          Aprobar
                        </button>
                        <button
                          type="button"
                          @click="openRejectModal(req)"
                          class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Icon icon="lucide:x" class="w-3.5 h-3.5" />
                          Rechazar
                        </button>
                      </div>
                      <div v-else class="text-center text-xs text-gray-400 italic">
                        Procesada
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </main>
  </div>

  <!-- Modal Confirmación Toggle Plan -->
  <AppModal
    v-model:open="confirmModalOpen"
    :title="pendingAction === 'premium' ? 'Activar Plan Premium' : 'Revocar Plan Premium (Downgrade a Free)'"
    :description="selectedUser 
      ? (pendingAction === 'premium'
          ? `¿Estás seguro de que deseas cambiar el plan de ${selectedUser.name} (${selectedUser.email}) a PREMIUM? El sistema despachará automáticamente el correo de activación (PremiumActivatedMail).`
          : `¿Estás seguro de que deseas degradar el plan de ${selectedUser.name} (${selectedUser.email}) a FREE? Se limpiarán los datos de pago y el sistema despachará automáticamente el correo de notificación (PlanDowngradedMail) con las restricciones del plan gratuito (3 cuentas activas y 6 meses de historial). El usuario deberá desactivar cuentas excedentes si tiene más de 3.`)
      : ''"
    :confirm-label="pendingAction === 'premium' ? 'Activar Premium y Notificar' : 'Degradar a Free y Notificar'"
    cancel-label="Cancelar"
    :variant="pendingAction === 'premium' ? 'default' : 'danger'"
    @confirm="handleConfirmToggle"
    @cancel="() => { confirmModalOpen = false; selectedUser = null; pendingAction = null; }"
  />

  <!-- Modal Registro de Pago en Efectivo Presencial (PRD 8.4) -->
  <Teleport to="body">
    <div
      v-if="cashModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Icon icon="lucide:banknote" class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-gray-900">Registrar Pago en Efectivo</h3>
            <p class="text-xs text-gray-500">Upgrade presencial para {{ cashUser?.name }}</p>
          </div>
        </div>

        <p class="text-xs text-gray-600">
          Al registrar el pago, el plan se actualizará a Premium inmediatamente y el sistema enviará en cola el correo de confirmación (<strong>PremiumActivatedMail</strong>) a {{ cashUser?.email }}.
        </p>

        <div class="space-y-2">
          <label class="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Notas de Pago (Obligatorio)
          </label>
          <textarea
            v-model="cashNotes"
            rows="3"
            class="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition"
            :class="cashNotesError ? 'border-danger bg-danger/5' : 'border-gray-200'"
            placeholder="Ej. Pago de anualidad recibido en efectivo en oficina central..."
          ></textarea>
          <p v-if="cashNotesError" class="text-xs text-danger">{{ cashNotesError }}</p>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="cashModalOpen = false"
            class="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="handleConfirmCashPayment"
            :disabled="isSubmittingCash"
            class="px-4 py-2 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
          >
            <span v-if="isSubmittingCash">Procesando...</span>
            <span v-else>Confirmar y Notificar</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Modal Rechazar Solicitud Premium (PRD 8.3) -->
  <Teleport to="body">
    <div
      v-if="rejectModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
            <Icon icon="lucide:alert-triangle" class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-gray-900">Rechazar Solicitud Premium</h3>
            <p class="text-xs text-gray-500">Solicitud de {{ selectedRequest?.user?.name || selectedRequest?.user_id }}</p>
          </div>
        </div>

        <p class="text-xs text-gray-600">
          De acuerdo con el PRD 8.3 y el contrato de API, debes ingresar un motivo claro. El sistema enviará automáticamente el correo de notificación (<strong>PremiumRejectedMail</strong>) con este motivo al cliente.
        </p>

        <div class="space-y-2">
          <label class="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Motivo de Rechazo (Obligatorio)
          </label>
          <textarea
            v-model="rejectionReason"
            rows="3"
            class="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-danger transition"
            :class="rejectionReasonError ? 'border-danger bg-danger/5' : 'border-gray-200'"
            placeholder="Ej. Comprobante ilegible, monto no coincide con la tarifa..."
          ></textarea>
          <p v-if="rejectionReasonError" class="text-xs text-danger">{{ rejectionReasonError }}</p>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="rejectModalOpen = false"
            class="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="handleConfirmReject"
            :disabled="isSubmittingReject"
            class="px-4 py-2 text-sm font-bold bg-danger text-white rounded-xl hover:bg-danger/90 disabled:opacity-50"
          >
            <span v-if="isSubmittingReject">Rechazando...</span>
            <span v-else>Rechazar Solicitud</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>