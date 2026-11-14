import { apiClient } from './apiClient'
import { buildContributionsPath } from '../utils/contributionsViewModel'

const BASE = '/api/v1/contributions'

/** Cotisations de l'API (aucun calcul ici ; identité = session par cookies HttpOnly, jamais envoyée). */
export const contributionsApi = {
  /** @returns {Promise<{ data: { contributions: object[] }, meta: object }>} */
  list: (filters) => apiClient.request(buildContributionsPath(filters), { withMeta: true }),
  summary: () => apiClient.request(`${BASE}/summary`),
  /** L'Idempotency-Key évite qu'un double envoi crée deux cotisations. */
  create: (payload, idempotencyKey) =>
    apiClient.request(BASE, { method: 'POST', body: payload, headers: { 'Idempotency-Key': idempotencyKey } }),
}
