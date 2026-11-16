import { AUTH_STATUS } from '../auth/authStore'

export function decideProtectedRoute(status) {
  if (status === AUTH_STATUS.INITIALIZING) return 'loading'
  if (status === AUTH_STATUS.ERROR) return 'error'
  if (status === AUTH_STATUS.AUTHENTICATED) return 'allow'
  return 'redirect-login'
}

export function decidePublicOnlyRoute(status) {
  if (status === AUTH_STATUS.INITIALIZING) return 'loading'
  if (status === AUTH_STATUS.AUTHENTICATED) return 'redirect-app'
  return 'allow'
}

export function getPostLoginPath(locationState, fallbackPath, loginPath) {
  const from = locationState?.from
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//') || from.startsWith(loginPath)) {
    return fallbackPath
  }
  return from
}
