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

const router = useRouter()
const toast = useToastStore()
const profileStore = useProfileStore()
const sessionStore = useSessionStore()
const accountsStore = useAccountsStore()
const transactionsStore = useTransactionsStore()

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
    const accounts = await db.accounts.toArray()
    const transactions = await db.transactions.toArray()

    const cleanAccounts = accounts.map(({ syncStatus, updatedAt, updated_at, ownerId, user_id, ...rest }) => ({
      ...rest,
      amount: Number(rest.amount ?? rest.initial_balance ?? 0),
      initial_balance: Number(rest.initial_balance ?? rest.amount ?? 0),
      currency: rest.currency || 'USD',
      is_default: Boolean(rest.is_default)
    }))

    const cleanTransactions = transactions.map(({ syncStatus, updatedAt, updated_at, ownerId, user_id, ...rest }) => ({
      ...rest,
      amount: Number(rest.amount),
      kind: rest.kind || rest.type || 'expense',
      type: rest.type || rest.kind || 'expense',
      paymentType: rest.paymentType || rest.payment_method || 'cash',
      payment_method: rest.payment_method || rest.paymentType || 'cash',
      accountId: rest.accountId || rest.account_id,
      account_id: rest.account_id || rest.accountId,
      date: rest.date || rest.createdAt || new Date().toISOString()
    }))

    const response = await api.post('/auth/register-sync', {
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      password: form.value.password,
      localData: { accounts: cleanAccounts, transactions: cleanTransactions }
    })

    const { token, refresh_token: refreshToken, user, syncedData } = response.data.data

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

    if (syncedData.accounts && syncedData.accounts.length > 0) {
      await db.accounts.bulkAdd(syncedData.accounts.map((a: any) => ({
        ...a,
        amount: Number(a.amount ?? a.initial_balance ?? 0),
        initial_balance: Number(a.initial_balance ?? a.amount ?? 0),
        syncStatus: 'synced'
      })))
    }
    if (syncedData.transactions && syncedData.transactions.length > 0) {
      await db.transactions.bulkAdd(syncedData.transactions.map((t: any) => ({
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

    await Promise.all([
      accountsStore.load(),
      transactionsStore.load(),
      profileStore.load()
    ])

    toast.success('¡Registro y sincronización exitosos!')
    router.push('/')

  } catch (error: any) {
    if (error.response?.status === 422) {
      const errors = error.response.data.errors
      errorMsg.value = errors ? errors[Object.keys(errors)[0]][0] : error.response.data.message
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