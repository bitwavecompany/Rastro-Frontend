<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/useToastStore'
import { useProfileStore } from '@/stores/useProfileStore'
import { useSessionStore } from '@/stores/useSessionStore'
import api from '@/api/axios'

const router = useRouter()
const toast = useToastStore()
const profileStore = useProfileStore()
const sessionStore = useSessionStore()

const form = ref({ email: '', password: '' })
const isLoading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  if (!form.value.email || !form.value.password) {
    errorMsg.value = 'Todos los campos son obligatorios'
    return
  }

  isLoading.value = true
  errorMsg.value = ''

  try {
    const response = await api.post('/auth/login', {
      email: form.value.email.trim(),
      password: form.value.password
    })

    const { token, refresh_token: refreshToken, user } = response.data.data

    // Validar que sea administrador
    if (user.role !== 'admin') {
      errorMsg.value = 'Acceso denegado. No tienes permisos de administrador.'
      return
    }

    sessionStore.setTokens(token, refreshToken)
    
    await profileStore.save({
      id: String(user.id),
      name: user.name,
      email: user.email,
      role: 'admin',
    })

    toast.success('¡Bienvenido Administrador!')
    router.push('/admin/dashboard')

  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } }
    if (err.response?.status === 422) {
      const errors = err.response.data?.errors
      errorMsg.value = errors ? errors[Object.keys(errors)[0]][0] : err.response.data?.message || 'Error de validación'
    } else if (err.response?.status === 401 || err.response?.status === 404) {
      errorMsg.value = 'Credenciales incorrectas'
    } else {
      errorMsg.value = err.response?.data?.message || 'Error al conectar con el servidor'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-900 flex flex-col justify-center items-center px-4 relative overflow-hidden">
    <!-- Decoración de fondo -->
    <div class="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
    <div class="absolute bottom-0 left-0 w-80 h-80 bg-danger/10 rounded-full blur-3xl pointer-events-none translate-y-1/4 -translate-x-1/4"></div>

    <div class="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 relative z-10">
      
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-gray-900 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-gray-900/20">
          <Icon icon="lucide:shield-check" class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Panel de Administración</h1>
        <p class="text-sm text-gray-500 mt-2">Ingresa tus credenciales seguras</p>
      </div>

      <div v-if="errorMsg" class="mb-5 flex items-start gap-2 bg-danger/10 border border-danger/30 text-danger/90 text-sm rounded-lg px-4 py-3">
        <Icon icon="lucide:circle-alert" class="w-4 h-4 mt-0.5 shrink-0" />
        {{ errorMsg }}
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Correo del Admin</label>
          <div class="relative">
            <Icon icon="lucide:mail" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input v-model="form.email" type="email" placeholder="admin@rastro.com" :disabled="isLoading" class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary/100 outline-none transition disabled:opacity-60" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Contraseña</label>
          <div class="relative">
            <Icon icon="lucide:lock" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input v-model="form.password" type="password" placeholder="••••••••" :disabled="isLoading" class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary/100 outline-none transition disabled:opacity-60" />
          </div>
        </div>

        <button type="submit" :disabled="isLoading" class="w-full mt-6 bg-gray-900 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-gray-800 active:bg-gray-700 transition-all disabled:opacity-70 shadow-md">
          {{ isLoading ? 'Verificando acceso...' : 'Ingresar al sistema' }}
        </button>
      </form>
      
      <button @click="router.push('/')" class="w-full mt-6 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors">
        Volver a la App
      </button>

    </div>
  </div>
</template>