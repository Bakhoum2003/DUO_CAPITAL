import { apiClient } from './apiClient'
import { activityPath, buildActionBody, buildActivitiesPath } from '../utils/activitiesViewModel'

/**
 * Activités commerciales de l'API (aucun calcul ici ; l'identité de l'auteur vient de la session par cookies
 * HttpOnly et n'est jamais envoyée). Aucun DELETE : une activité s'archive, son historique est conservé.
 */
export const activitiesApi = {
  /** @returns {Promise<{ data: { activities: object[] }, meta: object }>} */
  list: (filters) => apiClient.request(buildActivitiesPath(filters), { withMeta: true }),
  /** @returns {Promise<{ activity: object }>} */
  get: (id) => apiClient.request(activityPath(id)),
  create: (payload) => apiClient.request('/api/v1/activities', { method: 'POST', body: payload }),
  update: (id, payload) => apiClient.request(activityPath(id), { method: 'PATCH', body: payload }),
  /** action : 'suspend' | 'reactivate' | 'complete' | 'reopen' | 'archive' */
  transition: (id, action, input) => apiClient.request(`${activityPath(id)}/${action}`, { method: 'POST', body: buildActionBody(action, input) }),
}
