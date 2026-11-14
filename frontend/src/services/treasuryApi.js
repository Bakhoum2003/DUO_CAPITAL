import { apiClient } from './apiClient'
import { buildMovementsPath, movementPath } from '../utils/treasuryViewModel'

const BASE = '/api/v1/treasury'

/**
 * Trésorerie de l'API : lecture seule (aucun calcul ici ; le serveur est la source de vérité). L'identité vient de la
 * session par cookies HttpOnly et n'est jamais envoyée.
 */
export const treasuryApi = {
  summary: () => apiClient.request(`${BASE}/summary`),
  /** @returns {Promise<{ data: { movements: object[] }, meta: object }>} */
  movements: (filters) => apiClient.request(buildMovementsPath(filters), { withMeta: true }),
  /** @returns {Promise<{ movement: object }>} */
  movement: (type, id) => apiClient.request(movementPath(type, id)),
}
