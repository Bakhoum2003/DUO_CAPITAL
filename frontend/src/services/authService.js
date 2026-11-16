// Service d'authentification : appels réels vers les routes du backend (/api/auth/*).
// Les jetons voyagent uniquement dans des cookies HttpOnly : ce fichier n'en voit, n'en stocke et n'en journalise aucun.

import { apiClient } from './apiClient'

export const AUTH_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  ME: '/api/auth/me',
  LOGOUT: '/api/auth/logout',
}

export class RegistrationDisabledError extends Error {
  constructor() {
    super("L'inscription publique n'existe pas : les deux comptes des associés sont créés par le serveur.")
    this.name = 'RegistrationDisabledError'
  }
}

/** @param {{ request: Function }} client client HTTP (remplaçable dans les tests) */
export function createAuthService(client) {
  return {
    /** POST /api/auth/login -> { user, accessExpiresAt, refreshExpiresAt } ; pose les cookies de session. */
    login({ email, password }) {
      return client.request(AUTH_ENDPOINTS.LOGIN, { method: 'POST', body: { email, password }, skipRefresh: true })
    },

    /** GET /api/auth/me -> utilisateur authentifié { id, name, email, partnerNumber } (renouvelle la session si besoin). */
    async fetchCurrentUser() {
      const data = await client.request(AUTH_ENDPOINTS.ME)
      return data.user
    },

    /** POST /api/auth/logout : le serveur révoque la session et efface les cookies. */
    logout() {
      return client.request(AUTH_ENDPOINTS.LOGOUT, { method: 'POST', skipRefresh: true })
    },
  }
}

export const authService = createAuthService(apiClient)

export async function registerUser() {
  throw new RegistrationDisabledError()
}
