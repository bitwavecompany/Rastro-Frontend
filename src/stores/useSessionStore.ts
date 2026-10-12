import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { tokenStorage } from '@/services/tokenStorage'

export const useSessionStore = defineStore('session', () => {
  const token = ref<string | null>(tokenStorage.getAccessToken())
  const refreshToken = ref<string | null>(tokenStorage.getRefreshToken())
  const isRevokedRemotely = ref<boolean>(false)

  const isLoggedIn = computed(() => Boolean(token.value))
  const isGuest = computed(() => !token.value)

  function setTokens(newAccessToken: string, newRefreshToken?: string | null) {
    token.value = newAccessToken
    if (newRefreshToken) {
      refreshToken.value = newRefreshToken
    }
    tokenStorage.setTokens(newAccessToken, newRefreshToken)
    isRevokedRemotely.value = false
  }

  function clearTokens() {
    token.value = null
    refreshToken.value = null
    tokenStorage.clearTokens()
  }

  function triggerRemoteRevocation() {
    token.value = null
    refreshToken.value = null
    tokenStorage.clearTokens()
    isRevokedRemotely.value = true
  }

  function dismissRemoteRevocation() {
    isRevokedRemotely.value = false
  }

  return {
    token,
    refreshToken,
    isLoggedIn,
    isGuest,
    isRevokedRemotely,
    setTokens,
    clearTokens,
    triggerRemoteRevocation,
    dismissRemoteRevocation,
  }
})
