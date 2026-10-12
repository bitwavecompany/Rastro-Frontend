import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '@/api/admin'
import { useToastStore } from '@/stores/useToastStore'
import { useSessionStore } from '@/stores/useSessionStore'
import type { PremiumRequest, Profile } from '@/types/profile'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'

dayjs.extend(relativeTime)
dayjs.locale('es')

export function useAdminDashboard() {
  const router = useRouter()
  const toast = useToastStore()
  const sessionStore = useSessionStore()

  // Navigation tab state
  const activeTab = ref<'users' | 'requests'>('users')
  const users = ref<Profile[]>([])
  const premiumRequests = ref<PremiumRequest[]>([])
  const isLoadingUsers = ref(false)
  const isLoadingRequests = ref(false)

  // Toggle plan confirmation modal state
  const confirmModalOpen = ref(false)
  const selectedUser = ref<Profile | null>(null)
  const pendingAction = ref<'premium' | 'free' | null>(null)

  // In-person cash payment modal state (PRD 8.4)
  const cashModalOpen = ref(false)
  const cashUser = ref<Profile | null>(null)
  const cashNotes = ref('')
  const cashNotesError = ref('')
  const isSubmittingCash = ref(false)

  // Reject request modal state (PRD 8.3)
  const rejectModalOpen = ref(false)
  const selectedRequest = ref<PremiumRequest | null>(null)
  const rejectionReason = ref('')
  const rejectionReasonError = ref('')
  const isSubmittingReject = ref(false)

  // Computed summary metrics
  const pendingRequestsCount = computed(() => {
    return premiumRequests.value.filter(r => r.status === 'pending_verification').length
  })

  const premiumUsersCount = computed(() => {
    return users.value.filter(u => u.plan === 'premium').length
  })

  // Date formatting helpers strictly compliant with PRD Rule 11 (dd mmm yyyy without hours)
  function formatDate(iso?: string | null): string {
    if (!iso) return '—'
    return dayjs(iso).locale('es').format('DD MMM YYYY').toLowerCase()
  }

  function timeAgo(iso?: string | null): string {
    if (!iso) return ''
    return dayjs(iso).fromNow()
  }

  function handleApiAuthError(error: unknown, defaultMsg: string) {
    const err = error as { response?: { status?: number; data?: { message?: string } } }
    if (err.response?.status === 401 || err.response?.status === 403) {
      toast.error('Sesión caducada o sin permisos de administrador')
      router.push('/admin/login')
    } else {
      toast.error(err.response?.data?.message || defaultMsg)
    }
  }

  async function fetchUsers() {
    try {
      isLoadingUsers.value = true
      const { data } = await adminApi.getUsers()
      if (Array.isArray(data.data)) {
        users.value = data.data
      } else if (Array.isArray(data.data?.results)) {
        users.value = data.data.results
      } else if (Array.isArray(data)) {
        users.value = data
      } else {
        users.value = []
      }
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      handleApiAuthError(error, 'Error al cargar solicitudes premium')
    } finally {
      isLoadingRequests.value = false
    }
  }

  // --- Toggle Plan Action ---
  function requestPlanToggle(user: Profile) {
    selectedUser.value = user
    pendingAction.value = user.plan === 'premium' ? 'free' : 'premium'
    confirmModalOpen.value = true
  }

  function closeConfirmModal() {
    confirmModalOpen.value = false
    selectedUser.value = null
    pendingAction.value = null
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
        toast.success('Plan actualizado a PREMIUM. Correo de activación (PremiumActivatedMail) enviado al usuario.')
      } else {
        toast.success('Plan cambiado a FREE. Correo de notificación (PlanDowngradedMail) enviado al usuario.')
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || 'Error al cambiar el plan')
    } finally {
      closeConfirmModal()
    }
  }

  // --- Manual In-Person Cash Payment Action (PRD 8.4) ---
  function openCashModal(user: Profile) {
    cashUser.value = user
    cashNotes.value = `Pago presencial en efectivo registrado el ${dayjs().locale('es').format('DD MMM YYYY').toLowerCase()}`
    cashNotesError.value = ''
    cashModalOpen.value = true
  }

  function closeCashModal() {
    cashModalOpen.value = false
    cashUser.value = null
    cashNotes.value = ''
    cashNotesError.value = ''
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
      closeCashModal()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || 'Error al registrar pago en efectivo')
    } finally {
      isSubmittingCash.value = false
    }
  }

  // --- Approve Premium Request Action ---
  async function handleApproveRequest(req: PremiumRequest) {
    try {
      await adminApi.approvePremiumRequest(req.id)
      toast.success('Solicitud aprobada con éxito. Usuario promovido a Premium y correo de activación (PremiumActivatedMail) enviado.')
      req.status = 'approved'
      req.verified_at = new Date().toISOString()
      fetchUsers()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || 'Error al aprobar solicitud')
    }
  }

  // --- Reject Premium Request Action (PRD 8.3) ---
  function openRejectModal(req: PremiumRequest) {
    selectedRequest.value = req
    rejectionReason.value = ''
    rejectionReasonError.value = ''
    rejectModalOpen.value = true
  }

  function closeRejectModal() {
    rejectModalOpen.value = false
    selectedRequest.value = null
    rejectionReason.value = ''
    rejectionReasonError.value = ''
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
      closeRejectModal()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || 'Error al rechazar solicitud')
    } finally {
      isSubmittingReject.value = false
    }
  }

  function handleLogout() {
    sessionStore.clearTokens()
    router.push('/admin/login')
  }

  onMounted(() => {
    fetchUsers()
    fetchPremiumRequests()
  })

  return {
    activeTab,
    users,
    premiumRequests,
    isLoadingUsers,
    isLoadingRequests,
    pendingRequestsCount,
    premiumUsersCount,
    formatDate,
    timeAgo,
    fetchUsers,
    fetchPremiumRequests,
    // Plan toggle
    confirmModalOpen,
    selectedUser,
    pendingAction,
    requestPlanToggle,
    closeConfirmModal,
    handleConfirmToggle,
    // Cash modal
    cashModalOpen,
    cashUser,
    cashNotes,
    cashNotesError,
    isSubmittingCash,
    openCashModal,
    closeCashModal,
    handleConfirmCashPayment,
    // Approve/Reject request
    handleApproveRequest,
    rejectModalOpen,
    selectedRequest,
    rejectionReason,
    rejectionReasonError,
    isSubmittingReject,
    openRejectModal,
    closeRejectModal,
    handleConfirmReject,
    // Auth
    handleLogout,
  }
}
