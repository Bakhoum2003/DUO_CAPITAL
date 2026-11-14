// Client HTTP centralisé vers le backend DUO CAPITAL.
//
// Contrat du backend (vérifié dans le code) :
// - succès : { data: ... } ; erreur : { error: { code, message, fields? } } ;
// - authentification par cookies HttpOnly (jeton d'accès `dc_access`, refresh token `dc_refresh`) :
//   le JavaScript ne les voit jamais, le navigateur les renvoie grâce à `credentials: 'include'` ;
// - jeton d'accès expiré : le navigateur supprime le cookie à son expiration, la réponse est donc
//   401 UNAUTHENTICATED (ou 401 TOKEN_EXPIRED) ; on tente alors UN renouvellement via POST /api/auth/refresh.
//
// Règles :
// - un seul renouvellement à la fois (les requêtes qui échouent en même temps attendent le même) ;
// - un seul rejeu par requête, jamais de boucle ;
// - un refresh token n'est jamais réutilisé : le navigateur envoie toujours le cookie le plus récent ;
// - entre onglets, un verrou (Web Locks) évite deux renouvellements simultanés, qui déclencheraient la
//   détection de réutilisation du refresh token côté serveur.
// Aucun jeton n'est lu, stocké ni journalisé ici.

import { API_BASE_URL } from '../config/apiConfig'
import { NETWORK_ERROR_CODE, NETWORK_ERROR_MESSAGE } from '../utils/apiErrors'

export const REFRESH_PATH = '/api/auth/refresh'
const REFRESHABLE_CODES = new Set(['UNAUTHENTICATED', 'TOKEN_EXPIRED'])
const REFRESH_LOCK_NAME = 'duo-capital-auth-refresh'

export class ApiError extends Error {
  constructor({ status = 0, code = 'HTTP_ERROR', message = 'Erreur du serveur.', fields, cause } = {}) {
    super(message, cause ? { cause } : undefined)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

function defaultRefreshLock(task) {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  return locks?.request ? locks.request(REFRESH_LOCK_NAME, task) : task()
}

/**
 * @param {object} [options]
 * @param {string} [options.baseUrl] préfixe des adresses (vide = même origine)
 * @param {typeof fetch} [options.fetchImpl] remplaçable dans les tests
 * @param {(task: () => Promise<void>) => Promise<void>} [options.withRefreshLock]
 */
export function createApiClient({ baseUrl = API_BASE_URL, fetchImpl, withRefreshLock = defaultRefreshLock } = {}) {
  const doFetch = fetchImpl ?? ((...args) => globalThis.fetch(...args))
  let onSessionLost = () => {}
  let refreshInFlight = null

  async function rawRequest(path, { method = 'GET', body, headers: extraHeaders, withMeta = false } = {}) {
    const headers = { Accept: 'application/json', ...extraHeaders }
    const init = { method, credentials: 'include', cache: 'no-store', headers }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }

    let response
    try {
      response = await doFetch(`${baseUrl}${path}`, init)
    } catch (cause) {
      throw new ApiError({ status: 0, code: NETWORK_ERROR_CODE, message: NETWORK_ERROR_MESSAGE, cause })
    }

    let payload = null
    try {
      payload = await response.json()
    } catch {
      // Réponse vide ou non JSON : traitée ci-dessous.
    }

    if (response.ok) return withMeta ? { data: payload?.data ?? null, meta: payload?.meta ?? null } : (payload?.data ?? null)

    throw new ApiError({
      status: response.status,
      code: payload?.error?.code ?? 'HTTP_ERROR',
      message: payload?.error?.message ?? `Erreur du serveur (${response.status}).`,
      fields: payload?.error?.fields,
    })
  }

  function refreshSession() {
    if (!refreshInFlight) {
      refreshInFlight = withRefreshLock(async () => {
        try {
          await rawRequest(REFRESH_PATH, { method: 'POST' })
        } catch (error) {
          // 401 : la session est définitivement perdue (refresh token absent, expiré, révoqué ou déjà utilisé).
          // Une erreur réseau ou serveur ne prouve rien : la session reste telle quelle.
          if (error.status === 401) onSessionLost(error)
          throw error
        }
      }).finally(() => {
        refreshInFlight = null
      })
    }
    return refreshInFlight
  }

  /**
   * Appel d'une route de l'API. Retourne `data` ; lève ApiError sinon.
   * @param {string} path ex. « /api/auth/me »
   * @param {{ method?: string, body?: unknown, headers?: Record<string, string>, withMeta?: boolean, skipRefresh?: boolean }} [options]
   *   `headers` : en-têtes supplémentaires non secrets (ex. Idempotency-Key) ; `withMeta` : retourne { data, meta }.
   */
  async function request(path, options = {}) {
    try {
      return await rawRequest(path, options)
    } catch (error) {
      const canRefresh = !options.skipRefresh && error.status === 401 && REFRESHABLE_CODES.has(error.code)
      if (!canRefresh) throw error

      await refreshSession() // échec définitif : l'erreur du renouvellement est propagée
      return rawRequest(path, options) // un seul rejeu
    }
  }

  return {
    request,
    setSessionLostHandler(handler) {
      onSessionLost = typeof handler === 'function' ? handler : () => {}
    },
  }
}

export const apiClient = createApiClient()
