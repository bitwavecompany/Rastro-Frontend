<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/useToastStore'
import { authApi } from '@/api/auth'
import { authMergeService } from '@/services/authMergeService'

const router = useRouter()
const toast = useToastStore()

const form = ref({ name: '', email: '', password: '' })
const isLoading = ref(false)
const errorMsg = ref('')

async function handleRegister() {
  if (!form.value.name || !form.value.email || !form.value.password) {
    errorMsg.value = 'Todos los campos son obligatorios'
    return
  }

  isLoading.value = true
  errorMsg.value = ''

  try {
    const { accounts: cleanAccounts, transactions: cleanTransactions } =
      await authMergeService.prepareGuestDataForRegistration()

    const response = await authApi.registerSync({
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      password: form.value.password,
      device_name: 'Web Browser',
      localData: { accounts: cleanAccounts, transactions: cleanTransactions },
    })

    const { token, refresh_token: refreshToken, user, syncedData } = response.data.data

    await authMergeService.completeRegistrationSync({
      token,
      refreshToken,
      user,
      syncedAccounts: syncedData?.accounts || [],
      syncedTransactions: syncedData?.transactions || [],
    })

    toast.success('¡Registro y sincronización exitosos!')
    router.push('/')

  } catch (error: unknown) {
    const err = error as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } }
    if (err.response?.status === 422) {
      const errors = err.response.data?.errors
      errorMsg.value = errors ? errors[Object.keys(errors)[0]][0] : err.response.data?.message || 'Error de validación'
    } else {
      errorMsg.value = err.response?.data?.message || 'Error al conectar con el servidor'
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
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Crear cuenta</h1>
        <p class="text-sm text-gray-500 mt-2">Sincroniza tus datos en la nube y llévalos a cualquier dispositivo.</p>
      </div>

      <div v-if="errorMsg" class="mb-5 flex items-start gap-2 bg-danger/10 border border-danger/30 text-danger/90 text-sm rounded-lg px-4 py-3">
        <Icon icon="lucide:circle-alert" class="w-4 h-4 mt-0.5 shrink-0" />
        {{ errorMsg }}
      </div>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nombre o Alias</label>
          <input v-model="form.name" type="text" placeholder="Ej: Mi Negocio" :disabled="isLoading" class="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary/100 outline-none transition disabled:opacity-60" />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
          <input v-model="form.email" type="email" placeholder="correo@ejemplo.com" :disabled="isLoading" class="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary/100 outline-none transition disabled:opacity-60" />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Contraseña</label>
          <input v-model="form.password" type="password" placeholder="Mínimo 6 caracteres" :disabled="isLoading" class="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-primary/100 outline-none transition disabled:opacity-60" />
        </div>

        <button type="submit" :disabled="isLoading" class="w-full mt-4 bg-gray-900 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-gray-800 active:bg-gray-700 transition disabled:opacity-70">
          {{ isLoading ? 'Sincronizando datos...' : 'Registrarme' }}
        </button>
      </form>

      <div class="mt-8 text-center">
        <p class="text-sm text-gray-500">
          ¿Ya tienes una cuenta?
          <button @click="router.push('/login')" type="button" class="text-primary font-semibold hover:underline">
            Inicia sesión aquí
          </button>
        </p>
      </div>
    </div>
  </div>
</template>