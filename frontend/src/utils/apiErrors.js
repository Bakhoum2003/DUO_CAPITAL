// Messages affichés à l'utilisateur pour les erreurs de l'API (jamais de détail technique ni de donnée sensible).

export const NETWORK_ERROR_CODE = 'NETWORK_ERROR'
export const NETWORK_ERROR_MESSAGE =
  'Impossible de joindre le serveur. Vérifiez votre connexion et que le serveur est démarré, puis réessayez.'
export const OFFLINE_ERROR_MESSAGE =
  "Vous êtes hors connexion. Cette action nécessite une connexion à Internet : rien n'a été enregistré. Réessayez une fois reconnecté."
const SERVER_ERROR_MESSAGE = 'Le serveur a rencontré une erreur. Veuillez réessayer dans un instant.'
const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Veuillez réessayer."

/** Message lisible pour une erreur d'API (ApiError) ou toute autre erreur. */
export function getErrorMessage(error) {
  if (!error || typeof error !== 'object') return GENERIC_ERROR_MESSAGE
  if (error.code === NETWORK_ERROR_CODE) {
    // Navigateur hors connexion (information locale, rien n'est stocké) : message plus précis.
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false
    return isOffline ? OFFLINE_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE
  }

  const status = Number(error.status) || 0
  if (status >= 500) return SERVER_ERROR_MESSAGE
  if (error.code === 'VALIDATION_ERROR') return 'Les informations saisies sont invalides. Vérifiez-les et réessayez.'
  if (status === 401 || status === 403 || status === 429) return error.message || GENERIC_ERROR_MESSAGE
  return error.message || GENERIC_ERROR_MESSAGE
}
