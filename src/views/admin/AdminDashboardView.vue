<script setup lang="ts">
import { useAdminDashboard } from '@/composables/useAdminDashboard'
import AppModal from '@/components/ui/AppModal.vue'
import AdminMetricsGrid from '@/components/admin/AdminMetricsGrid.vue'
import AdminUsersTable from '@/components/admin/AdminUsersTable.vue'
import AdminRequestsTable from '@/components/admin/AdminRequestsTable.vue'
import AdminCashModal from '@/components/admin/AdminCashModal.vue'
import AdminRejectModal from '@/components/admin/AdminRejectModal.vue'

const {
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
  // Approve / Reject
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
} = useAdminDashboard()
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
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm font-medium cursor-pointer"
      >
        <Icon icon="lucide:log-out" class="w-4 h-4" />
        Cerrar Sesión
      </button>
    </header>

    <!-- Main Content -->
    <main class="flex-1 p-6 overflow-x-auto">
      <div class="max-w-7xl mx-auto space-y-6">

        <!-- Metrics cards -->
        <AdminMetricsGrid
          :total-users="users.length"
          :premium-users="premiumUsersCount"
          :pending-requests="pendingRequestsCount"
        />

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
        <AdminUsersTable
          v-if="activeTab === 'users'"
          :users="users"
          :is-loading="isLoadingUsers"
          :format-date="formatDate"
          @toggle-plan="requestPlanToggle"
          @open-cash-modal="openCashModal"
        />

        <!-- TAB 2: COLA DE SOLICITUDES PREMIUM -->
        <AdminRequestsTable
          v-if="activeTab === 'requests'"
          :requests="premiumRequests"
          :is-loading="isLoadingRequests"
          :format-date="formatDate"
          :time-ago="timeAgo"
          @approve="handleApproveRequest"
          @reject="openRejectModal"
        />

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
    @cancel="closeConfirmModal"
  />

  <!-- Modal Registro de Pago en Efectivo Presencial (PRD 8.4) -->
  <AdminCashModal
    :open="cashModalOpen"
    :user="cashUser"
    :notes="cashNotes"
    :error="cashNotesError"
    :is-submitting="isSubmittingCash"
    @update:notes="cashNotes = $event"
    @confirm="handleConfirmCashPayment"
    @cancel="closeCashModal"
  />

  <!-- Modal Rechazar Solicitud Premium (PRD 8.3) -->
  <AdminRejectModal
    :open="rejectModalOpen"
    :request="selectedRequest"
    :reason="rejectionReason"
    :error="rejectionReasonError"
    :is-submitting="isSubmittingReject"
    @update:reason="rejectionReason = $event"
    @confirm="handleConfirmReject"
    @cancel="closeRejectModal"
  />
</template>