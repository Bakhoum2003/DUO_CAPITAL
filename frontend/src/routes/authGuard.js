import { AUTH_STATUS } from '../auth/authStore'

/** Décision pour une page privée : 'loading' | 'error' | 'redirect-login' | 'allow'. */
export function decideProtectedRoute(status) {
  if (status === AUTH_STATUS.INITIALIZING) return 'loading'
  if (status === AUTH_STATUS.ERROR) return 'error'
  if (status === AUTH_STATUS.AUTHENTICATED) return 'allow'
  return 'redirect-login'
}

/** Décision pour la page de connexion : 'loading' | 'redirect-app' | 'allow'. */
export function decidePublicOnlyRoute(status) {
  if (status === AUTH_STATUS.INITIALIZING) return 'loading'
  if (status === AUTH_STATUS.AUTHENTICATED) return 'redirect-app'
  return 'allow'
}

/** Destination après connexion : la page demandée avant la redirection, si c'est une page privée valide. */
export function getPostLoginPath(locationState, fallbackPath, loginPath) {
  const from = locationState?.from
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//') || from.startsWith(loginPath)) {
    return fallbackPath
  }
  return from
}
