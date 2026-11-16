

import { ApiError } from '../services/apiClient'
import { getErrorMessage } from '../utils/apiErrors'

export const AUTH_STATUS = {
  INITIALIZING: 'initializing',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  ERROR: 'error',
}

export const SESSION_EXPIRED_NOTICE = 'Votre session a expiré. Veuillez vous reconnecter.'
const COOKIES_REJECTED_MESSAGE =
  "La connexion a réussi mais la session n'a pas été enregistrée par le navigateur. Vérifiez que les cookies sont autorisés."

/**
 * @param {{ authService: { login: Function, fetchCurrentUser: Function, logout: Function } }} deps
 */
export function createAuthStore({ authService }) {
  let state = { status: AUTH_STATUS.INITIALIZING, user: null, errorMessage: '', notice: '' }
  const listeners = new Set()
  let initPromise = null
  let loginPromise = null
  let logoutPromise = null

  function setState(patch) {
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener())
  }

  const setUnauthenticated = (notice = '') =>
    setState({ status: AUTH_STATUS.UNAUTHENTICATED, user: null, errorMessage: '', notice })

  async function runInit() {
    try {
      const user = await authService.fetchCurrentUser()
      setState({ status: AUTH_STATUS.AUTHENTICATED, user, errorMessage: '', notice: '' })
    } catch (error) {
      if (error?.status === 401) setUnauthenticated()
      else setState({ status: AUTH_STATUS.ERROR, user: null, errorMessage: getErrorMessage(error), notice: '' })
    }
  }

  /** Vérifie la session (une seule fois, même si appelée plusieurs fois, ex. React StrictMode). */
  function init() {
    if (!initPromise) initPromise = runInit()
    return initPromise
  }

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    init,

    retry() {
      initPromise = null
      setState({ status: AUTH_STATUS.INITIALIZING, errorMessage: '' })
      return init()
    },

    /**
     * Connexion : le serveur crée la session et pose les cookies, puis on relit l'utilisateur via /me
     * (preuve que le navigateur a bien enregistré les cookies). Lève une ApiError en cas d'échec.
     */
    login({ email, password }) {
      if (!loginPromise) {
        loginPromise = (async () => {
          await authService.login({ email, password })
          let user
          try {
            user = await authService.fetchCurrentUser()
          } catch (error) {
            if (error?.status === 401) throw new ApiError({ status: 401, code: 'SESSION_NOT_STORED', message: COOKIES_REJECTED_MESSAGE })
            throw error
          }
          setState({ status: AUTH_STATUS.AUTHENTICATED, user, errorMessage: '', notice: '' })
        })().finally(() => {
          loginPromise = null
        })
      }
      return loginPromise
    },

    /**
     * Déconnexion confirmée par le serveur. Si le serveur ne répond pas, l'utilisateur reste connecté
     * (la session serveur est toujours active) et un message l'explique : on ne prétend jamais le contraire.
     * @returns {Promise<{ ok: true } | { ok: false, message: string }>}
     */
    logout() {
      if (!logoutPromise) {
        logoutPromise = (async () => {
          try {
            await authService.logout()
          } catch (error) {
            const message =
              error?.code === 'NETWORK_ERROR'
                ? 'Déconnexion impossible : le serveur est injoignable. Votre session reste active, réessayez.'
                : `Déconnexion non confirmée par le serveur. ${getErrorMessage(error)}`
            return { ok: false, message }
          }
          setUnauthenticated()
          return { ok: true }
        })().finally(() => {
          logoutPromise = null
        })
      }
      return logoutPromise
    },

    /** Appelé par le client HTTP quand le renouvellement de session échoue définitivement (401). */
    handleSessionLost() {
      // Un visiteur sans session (initialisation) n'a rien « perdu » : pas de message d'expiration.
      if (state.status === AUTH_STATUS.AUTHENTICATED) setUnauthenticated(SESSION_EXPIRED_NOTICE)
    },
  }
}
