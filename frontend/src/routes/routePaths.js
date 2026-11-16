export const ROUTES = {
  LOGIN: '/connexion',
  REGISTER: '/inscription',
  DASHBOARD: '/dashboard',
  CONTRIBUTIONS: '/cotisations',
  TREASURY: '/tresorerie',
  WITHDRAWALS: '/retraits',
  ACTIVITIES: '/activites',
  ACTIVITY_DETAILS: '/activites/:activityId',
  BUSINESS: '/business',
  BUSINESS_DETAILS: '/business/:businessId',
  HISTORY: '/historique',
  STATISTICS: '/statistiques',
  SETTINGS: '/parametres',
}

export function getBusinessDetailsPath(businessId) {
  return `${ROUTES.BUSINESS}/${businessId}`
}

export function activityDetailsPath(activityId) {
  return `${ROUTES.ACTIVITIES}/${activityId}`
}
