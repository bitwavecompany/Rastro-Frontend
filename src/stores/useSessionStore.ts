import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSessionStore = defineStore('session', () => {
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refresh_token'))
  const isRevokedRemotely = ref<boolean>(false)

  const isLoggedIn = computed(() => !!token.value)
  const isGuest = computed(() => !token.value)

  function setTokens(newAccessToken: string, newRefreshToken?: string | null) {
    token.value = newAccessToken
    localStorage.setItem('auth_token', newAccessToken)

    if (newRefreshToken) {
      refreshToken.value = newRefreshToken
      localStorage.setItem('refresh_token', newRefreshToken)
    }
    isRevokedRemotely.value = false
  }

  function setToken(newToken: string) {
    setTokens(newToken)
  }

  function clearTokens() {
    token.value = null
    refreshToken.value = null
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
  }

  function clearToken() {
    clearTokens()
  }

  function triggerRemoteRevocation() {
    token.value = null
    localStorage.removeItem('auth_token')
    isRevokedRemotely.value = true
  }

  function dismissRemoteRevocation() {
    isRevokedRemotely.value = false
  }

  return {
    token,
    accessToken: token,
    refreshToken,
    isLoggedIn,
    isGuest,
    isRevokedRemotely,
    setToken,
    setTokens,
    clearToken,
    clearTokens,
    triggerRemoteRevocation,
    dismissRemoteRevocation
  }
})

