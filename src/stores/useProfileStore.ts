import { defineStore } from 'pinia'
import { ref } from 'vue'
import { toPlainObject } from '@/utils/clone'
import { db } from '@/database/db'
import { authApi } from '@/api/auth'
import { useSessionStore } from './useSessionStore'
import { useAccountsStore } from './useAccountsStore'
import { useTransactionsStore } from './useTransactionsStore'
import { syncEngine } from '@/sync/SyncEngine'
import type { Profile } from '@/types/profile'

function generateLocalUserId(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  return `guest_${hex}`
}

const EMPTY_PROFILE: Omit<Profile, 'id'> = {
  name: 'Usuario Invitado',
  email: null,
  plan: 'guest',
}

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<Profile>({ id: generateLocalUserId(), ...EMPTY_PROFILE })
  const isLoaded = ref(false)
  const justUpgraded = ref(false)
  const session = useSessionStore()

  async function load() {
    try {
      if (session.isLoggedIn) {
        const { data } = await authApi.me()
        const user = data.data

        if (profile.value.plan === 'free' && user.plan === 'premium') {
          justUpgraded.value = true
        }

        profile.value = {
          id: String(user.id),
          name: user.name || 'Usuario',
          email: user.email || null,
          plan: user.plan || 'free',
          role: user.role || 'client',
          payment_method: user.payment_method || null,
          payment_bank: user.payment_bank || null,
          payment_receipt: user.payment_receipt || null,
          created_at: user.created_at,
          updated_at: user.updated_at,
        }
        await db.profile.put(toPlainObject(profile.value))
      } else {
        const profiles = await db.profile.toArray()
        if (profiles.length > 0) {
          profile.value = { ...profiles[0], plan: profiles[0].plan || 'guest' }
        } else {
          profile.value = { id: generateLocalUserId(), ...EMPTY_PROFILE }
          await db.profile.add(toPlainObject(profile.value))
        }
      }
    } catch (_error) {
      const profiles = await db.profile.toArray()
      if (profiles.length > 0) {
        profile.value = profiles[0]
      }
    } finally {
      isLoaded.value = true
    }
  }

  async function silentSync() {
    if (!session.isLoggedIn) return
    try {
      const { data } = await authApi.me()
      const user = data.data
      
      if (profile.value.plan === 'free' && user.plan === 'premium') {
        justUpgraded.value = true
      }

      if (profile.value.plan !== user.plan || profile.value.name !== user.name) {
        profile.value = {
          ...profile.value,
          plan: user.plan || 'free',
          name: user.name || profile.value.name,
          payment_method: user.payment_method,
          payment_bank: user.payment_bank,
          payment_receipt: user.payment_receipt
        }
        await db.profile.put(toPlainObject(profile.value))
      }
    } catch (_error) {
      // Ignorar errores silenciosos de red
    }
  }

  async function save(payload: Partial<Profile>) {
    if (session.isLoggedIn && payload.name) {
      await authApi.updateMe({ name: payload.name })
    }
    const updatedProfile = { ...profile.value, ...payload }
    profile.value = updatedProfile
    await db.profile.put(toPlainObject(updatedProfile))
  }

  async function setProfileLocally(payload: Partial<Profile>) {
    const updatedProfile = { ...profile.value, ...payload }
    profile.value = updatedProfile
    await db.profile.put(toPlainObject(updatedProfile))
  }

  function dismissUpgradeBanner() {
    justUpgraded.value = false
  }

  async function clearAllLocalData() {
    syncEngine.stopAutoSync()
    session.clearTokens()
    syncEngine.resetSyncCheckpoint()

    // 1. Limpiar todas las tablas de IndexedDB dinámicamente
    await Promise.all(db.tables.map(table => table.clear()))

    // 2. Limpiar estado reactivo en memoria de los stores
    const accountsStore = useAccountsStore()
    await accountsStore.clearAll()

    const transactionsStore = useTransactionsStore()
    await transactionsStore.clearAll()

    // 3. Restablecer perfil base en memoria sin persistir en Dexie para dejar DB 100% limpia
    profile.value = { id: generateLocalUserId(), ...EMPTY_PROFILE }
    isLoaded.value = false
  }

  return {
    profile,
    isLoaded,
    justUpgraded,
    dismissUpgradeBanner,
    load,
    silentSync,
    save,
    setProfileLocally,
    clearAllLocalData
  }
})