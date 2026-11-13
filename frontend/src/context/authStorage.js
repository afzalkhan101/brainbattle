// Signing out must preserve interface preferences and unrelated browser storage.
export function clearAuthTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}
