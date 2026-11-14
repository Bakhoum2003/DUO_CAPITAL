import { apiClient } from './apiClient'
import { buildHistoryPath, operationPath } from '../utils/historyViewModel'

const BASE = '/api/v1/history'

/**
 * Historique de l'API : lecture seule (aucun calcul ici ; le serveur est la source de vérité). L'identité vient de la
 * session par cookies HttpOnly et n'est jamais envoyée.
 */
export const historyApi = {
  summary: () => apiClient.request(`${BASE}/summary`),
  /** @returns {Promise<{ data: { operations: object[] }, meta: object }>} */
  list: (filters) => apiClient.request(buildHistoryPath(filters), { withMeta: true }),
  /** @returns {Promise<{ operation: object }>} */
  detail: (type, id) => apiClient.request(operationPath(type, id)),
}
