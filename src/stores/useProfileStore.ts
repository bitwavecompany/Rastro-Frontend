import { defineStore } from 'pinia'
import { ref, toRaw } from 'vue'
import { db } from '@/database/db'
import { authApi } from '@/api/auth'
import type { Profile } from '@/types/profile'

function generateLocalUserId(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  return `usr_${hex}`
}

const EMPTY_PROFILE: Omit<Profile, 'id'> = {
  name: 'Usuario Invitado',
  email: '',
  roleToken: 'Z3Vlc3RfbGV2ZWxfMjAyNg==',
}

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<Profile>({ id: generateLocalUserId(), ...EMPTY_PROFILE })
  const isLoaded = ref(false)
  const justUpgraded = ref(false)

  async function load() {
    try {
      if (localStorage.getItem('auth_token')) {
        const { data } = await authApi.me()
        const user = data.data
        const newToken = user.plan === 'premium' ? 'cHJlbWl1bV91bmxvY2tlZF8yMDI2' : 'cmVnaXN0ZXJlZF9sZXZlbF8yMDI2'

        if (profile.value.roleToken === 'cmVnaXN0ZXJlZF9sZXZlbF8yMDI2' && newToken === 'cHJlbWl1bV91bmxvY2tlZF8yMDI2') {
          justUpgraded.value = true
        }

        profile.value = {
          id: String(user.id),
          name: user.name,
          email: user.email,
          roleToken: newToken,
        }
        await db.profile.put(toRaw(profile.value))
      } else {
        const profiles = await db.profile.toArray()
        if (profiles.length > 0) profile.value = profiles[0]
        else await db.profile.add(toRaw(profile.value))
      }
    } catch (error) {
      const profiles = await db.profile.toArray()
      if (profiles.length > 0) profile.value = profiles[0]
    } finally {
      isLoaded.value = true
    }
  }

  async function silentSync() {
    if (!localStorage.getItem('auth_token')) return
    try {
      const { data } = await authApi.me()
      const user = data.data
      const newToken = user.plan === 'premium' ? 'cHJlbWl1bV91bmxvY2tlZF8yMDI2' : 'cmVnaXN0ZXJlZF9sZXZlbF8yMDI2'

      if (profile.value.roleToken === 'cmVnaXN0ZXJlZF9sZXZlbF8yMDI2' && newToken === 'cHJlbWl1bV91bmxvY2tlZF8yMDI2') {
        justUpgraded.value = true
      }

      if (profile.value.roleToken !== newToken) {
        profile.value.roleToken = newToken
        await db.profile.put(toRaw(profile.value))
      }
    } catch (error) {
    }
  }

  async function save(payload: Partial<Profile>) {
    if (localStorage.getItem('auth_token') && payload.name) {
      await authApi.updateMe({ name: payload.name })
    }
    const updatedProfile = { ...profile.value, ...payload }
    profile.value = updatedProfile
    await db.profile.put(toRaw(updatedProfile))
  }

  function dismissUpgradeBanner() {
    justUpgraded.value = false
  }

  async function clearAllLocalData() {
    await db.delete()
    await db.open()
    localStorage.clear()
    window.location.reload()
  }

  return { profile, isLoaded, justUpgraded, dismissUpgradeBanner, load, silentSync, save, clearAllLocalData }
})