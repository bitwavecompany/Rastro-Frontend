import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '@/database/db'
import type { Profile } from '@/types/profile'

function generateLocalUserId(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `usr_${hex}`
}

const EMPTY_PROFILE: Omit<Profile, 'id'> = {
  name: 'Usuario Invitado',
  email: '',
  phone: '',
  company: '',
  bio: '',
}

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<Profile>({
    id: generateLocalUserId(),
    ...EMPTY_PROFILE,
  })

  const isSynced = ref(false)
  const isLoaded = ref(false)

  async function load() {
    try {
      const profiles = await db.profile.toArray()
      
      if (profiles.length > 0) {
        profile.value = profiles[0]
      } else {
        await db.profile.add(profile.value)
      }
    } catch (error) {
      console.error('Error cargando perfil:', error)
    } finally {
      isLoaded.value = true
    }
  }

  async function save(payload: Partial<Profile>) {
    try {
      const updatedProfile = { ...profile.value, ...payload }
      profile.value = updatedProfile
      await db.profile.put(updatedProfile)
    } catch (error) {
      console.error('Error guardando perfil:', error)
    }
  }

  async function clearAllLocalData() {
    try {
      await db.delete()      
      await db.open()        
      localStorage.clear()   
      window.location.reload()
    } catch (error) {
      console.error('Error limpiando datos:', error)
    }
  }

  return { profile, isSynced, isLoaded, load, save, clearAllLocalData }
})