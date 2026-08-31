<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '@/api/admin'
import { useToastStore } from '@/stores/useToastStore'
import AppModal from '@/components/ui/AppModal.vue'
import dayjs from 'dayjs'

const router = useRouter()
const toast = useToastStore()

const users = ref<any[]>([])
const isLoading = ref(true)

const confirmModalOpen = ref(false)
const selectedUser = ref<any>(null)
const pendingAction = ref<'premium' | 'free' | null>(null)

async function fetchUsers() {
  try {
    isLoading.value = true
    const { data } = await adminApi.getUsers()
    users.value = data.data
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      toast.error('Sesión caducada o sin permisos')
      router.push('/admin/login')
    } else {
      toast.error(error.response?.data?.message || 'Error al cargar usuarios')
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchUsers()
})

function formatDate(iso: string) {
  return dayjs(iso).format('DD/MM/YYYY')
}

// Abre el modal para confirmar el cambio de plan
function requestPlanToggle(user: any) {
  selectedUser.value = user
  pendingAction.value = user.plan === 'free' ? 'premium' : 'free'
  confirmModalOpen.value = true
}

// Ejecuta la petición al backend una vez confirmada
async function handleConfirmToggle() {
  if (!selectedUser.value || !pendingAction.value) return

  try {
    const payload = {
      plan: pendingAction.value,
      // Si estamos activando premium, enviamos la info de pago que el usuario registró para no perderla en el historial, 
      // si pasa a free, el backend lo limpia automáticamente.
      payment_method: selectedUser.value.payment_method,
      payment_bank: selectedUser.value.payment_bank,
      payment_receipt: selectedUser.value.payment_receipt,
    }

    const { data } = await adminApi.togglePlan(selectedUser.value.id, payload)
    
    // Actualizamos localmente el usuario en la tabla
    const index = users.value.findIndex(u => u.id === selectedUser.value.id)
    if (index !== -1) {
      users.value[index] = data.data
    }

    toast.success(`Plan actualizado a ${pendingAction.value.toUpperCase()}`)
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Error al cambiar el plan')
  } finally {
    confirmModalOpen.value = false
    selectedUser.value = null
    pendingAction.value = null
  }
}

function handleCancelToggle() {
  confirmModalOpen.value = false
  selectedUser.value = null
  pendingAction.value = null
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
        <div class="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
          <Icon icon="lucide:shield-check" class="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 class="text-lg font-bold tracking-tight">Rastro Admin</h1>
          <p class="text-xs text-gray-400">Gestión de Clientes y Suscripciones</p>
        </div>
      </div>
      <button 
        @click="handleLogout"
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm font-medium"
      >
        <Icon icon="lucide:log-out" class="w-4 h-4" />
        Salir
      </button>
    </header>

    <!-- Main Content -->
    <main class="flex-1 p-6 overflow-x-auto">
      <div class="max-w-7xl mx-auto space-y-6">
        
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-900">Lista de Clientes Registrados</h2>
          <button @click="fetchUsers" class="text-sm font-medium text-primary flex items-center gap-1.5 hover:underline">
            <Icon icon="lucide:refresh-cw" class="w-4 h-4" :class="{'animate-spin': isLoading}" />
            Actualizar
          </button>
        </div>

        <div v-if="isLoading && users.length === 0" class="py-20 text-center">
          <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="text-gray-500 mt-4 text-sm">Cargando usuarios...</p>
        </div>

        <div v-else class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase text-xs tracking-wider">
                  <th class="px-6 py-4 font-semibold">Cliente</th>
                  <th class="px-6 py-4 font-semibold">Plan Actual</th>
                  <th class="px-6 py-4 font-semibold">Datos de Pago (Premium)</th>
                  <th class="px-6 py-4 font-semibold">Registro</th>
                  <th class="px-6 py-4 font-semibold text-center w-32">Activar Premium</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-if="users.length === 0">
                  <td colspan="5" class="px-6 py-10 text-center text-gray-500">
                    No hay clientes registrados en el sistema.
                  </td>
                </tr>
                <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50/50 transition">
                  <!-- Datos Cliente -->
                  <td class="px-6 py-4">
                    <p class="font-bold text-gray-900">{{ user.name }}</p>
                    <p class="text-xs text-gray-500 mt-0.5">{{ user.email }}</p>
                  </td>
                  
                  <!-- Plan Badge -->
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

                  <!-- Registro -->
                  <td class="px-6 py-4 text-xs text-gray-500">
                    {{ formatDate(user.created_at) }}
                  </td>

                  <!-- Toggle Switch -->
                  <td class="px-6 py-4">
                    <div class="flex justify-center">
                      <button 
                        @click="requestPlanToggle(user)"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        :class="user.plan === 'premium' ? 'bg-amber-500' : 'bg-gray-200'"
                      >
                        <span class="sr-only">Toggle Premium</span>
                        <span 
                          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm"
                          :class="user.plan === 'premium' ? 'translate-x-6' : 'translate-x-1'"
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  </div>

  <!-- Modal Confirmación -->
  <AppModal
    v-model:open="confirmModalOpen"
    :title="pendingAction === 'premium' ? 'Activar Plan Premium' : 'Revocar Plan Premium'"
    :description="selectedUser 
      ? `¿Estás seguro de que deseas cambiar el plan de ${selectedUser.name} a ${pendingAction?.toUpperCase()}?` 
      : ''"
    :confirm-label="pendingAction === 'premium' ? 'Activar Premium' : 'Pasar a Free'"
    cancel-label="Cancelar"
    :variant="pendingAction === 'premium' ? 'default' : 'danger'"
    @confirm="handleConfirmToggle"
    @cancel="handleCancelToggle"
  />
</template>