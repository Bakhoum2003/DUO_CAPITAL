import { apiClient } from './apiClient'
import { buildStatisticsPath } from '../utils/statisticsViewModel'

/**
 * Statistiques de l'API : lecture seule (aucun calcul ici ; le serveur est la source de vérité). L'identité vient de la
 * session par cookies HttpOnly et n'est jamais envoyée.
 */
export const statisticsApi = {
  /** @param {{ periodKey: string, customStartDate?: string, customEndDate?: string }} period */
  get: (period) => apiClient.request(buildStatisticsPath(period)),
}
