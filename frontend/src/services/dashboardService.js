import { apiClient } from './apiClient'
import { buildDashboardPath } from '../utils/dashboardViewModel'

/**
 * Lit le dashboard financier commun (GET /api/v1/dashboard). Aucun calcul ici : le serveur renvoie les totaux.
 * L'identité vient de la session (cookies), jamais d'un paramètre.
 */
export function getDashboard(filter) {
  return apiClient.request(buildDashboardPath(filter))
}
