import { apiClient } from './apiClient'
import { buildWithdrawalsPath, withdrawalPath } from '../utils/withdrawalsViewModel'

const BASE = '/api/v1/withdrawals'

/** Retraits de l'API (aucun calcul ici ; l'auteur vient de la session par cookies HttpOnly, il n'est jamais envoyé). */
export const withdrawalsApi = {
  /** @returns {Promise<{ data: { withdrawals: object[] }, meta: object }>} */
  list: (filters) => apiClient.request(buildWithdrawalsPath(filters), { withMeta: true }),
  summary: () => apiClient.request(`${BASE}/summary`),
  get: (id) => apiClient.request(withdrawalPath(id)),
  /** L'Idempotency-Key évite qu'un double envoi crée deux retraits. */
  create: (payload, idempotencyKey) => apiClient.request(BASE, { method: 'POST', body: payload, headers: { 'Idempotency-Key': idempotencyKey } }),
  update: (id, changes) => apiClient.request(withdrawalPath(id), { method: 'PATCH', body: changes }),
  remove: (id, reason) => apiClient.request(withdrawalPath(id), { method: 'DELETE', ...(reason ? { body: { reason } } : {}) }),
}
