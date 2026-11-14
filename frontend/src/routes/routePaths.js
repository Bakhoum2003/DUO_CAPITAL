// Chemins de l'application, centralisés pour éviter les chaînes dupliquées.
export const ROUTES = {
  LOGIN: '/connexion',
  REGISTER: '/inscription',
  DASHBOARD: '/dashboard',
  CONTRIBUTIONS: '/cotisations',
  TREASURY: '/tresorerie',
  WITHDRAWALS: '/retraits',
  ACTIVITIES: '/activites',
  ACTIVITY_DETAILS: '/activites/:activityId',
  // Ancienne adresse du module Business : redirigée vers les activités (anciens liens et favoris).
  BUSINESS: '/business',
  BUSINESS_DETAILS: '/business/:businessId',
  HISTORY: '/historique',
  STATISTICS: '/statistiques',
  SETTINGS: '/parametres',
}

// '/business/business-001' : adresse de la page de détails d'un business.
export function getBusinessDetailsPath(businessId) {
  return `${ROUTES.BUSINESS}/${businessId}`
}

// '/activites/66a…' : adresse de la page de détail d'une activité.
export function activityDetailsPath(activityId) {
  return `${ROUTES.ACTIVITIES}/${activityId}`
}
