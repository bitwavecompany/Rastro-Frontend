/**
 * Unified token storage service.
 * Acts as the Single Source of Truth for persisting access and refresh tokens.
 */

const ACCESS_TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

export const tokenStorage = {
  /**
   * Retrieves the current access token.
   */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  /**
   * Retrieves the current refresh token.
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  /**
   * Persists the access token and optional refresh token.
   */
  setTokens(accessToken: string, refreshToken?: string | null): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    }
  },

  /**
   * Clears both access and refresh tokens.
   */
  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },

  /**
   * Checks whether an access token exists.
   */
  hasAccessToken(): boolean {
    return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY))
  },
}
