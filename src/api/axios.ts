import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { tokenStorage } from '@/services/tokenStorage'

interface CustomRequestConfig extends AxiosRequestConfig {
  _retry?: boolean
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else if (token) {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = (error.config || {}) as CustomRequestConfig
    const url = originalRequest.url || ''
    const isAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/admin/login')

    if (error.response?.status === 401 && !isAuthRoute) {
      const code = error.response?.data?.code

      // Caso 1: Sesión revocada remotamente desde otro dispositivo (Reglas 13 y 15)
      if (code === 'SESSION_REVOKED_REMOTE') {
        try {
          const { syncEngine } = await import('@/sync/SyncEngine')
          syncEngine.freeze()

          const { useSessionStore } = await import('@/stores/useSessionStore')
          const sessionStore = useSessionStore()
          sessionStore.triggerRemoteRevocation()
        } catch (e) {
          console.error('Error handling remote session revocation', e)
        }
        return Promise.reject(error)
      }

      // Caso 2: Access token expirado o 401 estándar -> Intentar refresco transparente con refresh_token
      const refreshToken = tokenStorage.getRefreshToken()
      if (!refreshToken) {
        // No hay refresh token disponible: invalidar tokens sin tocar base de datos local
        try {
          const { useSessionStore } = await import('@/stores/useSessionStore')
          const sessionStore = useSessionStore()
          sessionStore.clearTokens()
        } catch (e) {
          console.error('Error clearing session on missing refresh token', e)
        }
        return Promise.reject(error)
      }

      if (originalRequest._retry) {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((newToken) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
            }
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshUrl = `${import.meta.env.VITE_API_URL}/auth/refresh`
        const refreshResponse = await axios.post(
          refreshUrl,
          { refresh_token: refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          }
        )

        const responseData = refreshResponse.data?.data || refreshResponse.data
        const newAccessToken = responseData.access_token || responseData.token
        const newRefreshToken = responseData.refresh_token

        const { useSessionStore } = await import('@/stores/useSessionStore')
        const sessionStore = useSessionStore()
        sessionStore.setTokens(newAccessToken, newRefreshToken)

        processQueue(null, newAccessToken)

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        }
        return api(originalRequest)
      } catch (refreshError: unknown) {
        processQueue(refreshError, null)

        const refreshCode = (refreshError as { response?: { data?: { code?: string } } })?.response?.data?.code
        if (refreshCode === 'SESSION_REVOKED_REMOTE') {
          try {
            const { syncEngine } = await import('@/sync/SyncEngine')
            syncEngine.freeze()
            const { useSessionStore } = await import('@/stores/useSessionStore')
            const sessionStore = useSessionStore()
            sessionStore.triggerRemoteRevocation()
          } catch (e) {
            console.error('Error handling remote revocation during refresh', e)
          }
        } else {
          // Token inválido o expirado permanentemente: limpiar tokens pero preservar DB local
          try {
            const { useSessionStore } = await import('@/stores/useSessionStore')
            const sessionStore = useSessionStore()
            sessionStore.clearTokens()
          } catch (e) {
            console.error('Error clearing session on refresh failure', e)
          }
        }

        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api