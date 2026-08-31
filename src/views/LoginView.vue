<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/useToastStore'
import { useProfileStore } from '@/stores/useProfileStore'
import { db } from '@/database/db'
import api from '@/api/axios'

const router = useRouter()
const toast = useToastStore()
const profileStore = useProfileStore()

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

    const { token, user } = response.data.data

    localStorage.setItem('auth_token', token)

    const roleToken = user.plan === 'premium' 
      ? 'cHJlbWl1bV91bmxvY2tlZF8yMDI2' 
      : 'cmVnaXN0ZXJlZF9sZXZlbF8yMDI2'

    // 3. Actualizar el perfil local
    await profileStore.save({
      id: String(user.id),
      name: user.name,
      email: user.email,
      roleToken
    })

    await db.accounts.clear()
    await db.transactions.clear()

    toast.success('¡Inicio de sesión exitoso!')
    
    window.location.href = '/'

  } catch (error: any) {
    if (error.response?.status === 422) {
      const errors = error.response.data.errors
      errorMsg.value = errors[Object.keys(errors)[0]][0]
    } else if (error.response?.status === 401 || error.response?.status === 404) {
      errorMsg.value = 'Credenciales incorrectas'
    } else {
      errorMsg.value = error.response?.data?.message || 'Error al conectar con el servidor'
    }
  } finally {
    isLoading.value = false
  }
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

      <form @submit.prevent="handleLogin" class="space-y-4">
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
</template>