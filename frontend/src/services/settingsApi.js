import { apiClient } from './apiClient'

const BASE = '/api/v1/settings'

/**
 * Paramètres de l'API (cookies HttpOnly, via apiClient : aucun jeton manipulé ici).
 * L'identité de l'associé vient de la session ; elle n'est jamais envoyée.
 * - paramètres communs : GET/PUT /settings (version de contrôle `expectedVersion`, conflit = HTTP 409) ;
 * - préférences personnelles : GET/PUT /settings/preferences, POST /settings/preferences/reset ;
 * - rappels de cotisation et sécurité : lecture seule.
 */
export const settingsApi = {
  getSettings: () => apiClient.request(BASE),
  /** @param {{ expectedVersion: number, description?: string, projectInfo?: string }} body */
  updateSettings: (body) => apiClient.request(BASE, { method: 'PUT', body }),
  getPreferences: () => apiClient.request(`${BASE}/preferences`),
  /** @param {{ theme?: string, amountSeparator?: string, visualNotificationsEnabled?: boolean, contributionRemindersEnabled?: boolean }} changes */
  updatePreferences: (changes) => apiClient.request(`${BASE}/preferences`, { method: 'PUT', body: changes }),
  resetPreferences: () => apiClient.request(`${BASE}/preferences/reset`, { method: 'POST', body: {} }),
  getContributionReminders: () => apiClient.request(`${BASE}/contribution-reminders`),
  getSecurity: () => apiClient.request(`${BASE}/security`),
}
