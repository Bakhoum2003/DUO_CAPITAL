// État du chargement du dashboard (fonction pure, testable sans React).
// - « loading » : première lecture, aucune donnée ;
// - « refreshing » : les données précédentes restent affichées pendant une nouvelle lecture ;
// - « error » : échec, sans effacer les dernières données valides (elles sont signalées comme périmées) ;
// - une réponse d'une requête périmée (requestId différent) est ignorée.

export const initialDashboardState = Object.freeze({ status: 'loading', data: null, errorMessage: '', requestId: 0 })

export function dashboardReducer(state, action) {
  switch (action.type) {
    case 'request':
      return { ...state, requestId: action.requestId, status: state.data ? 'refreshing' : 'loading', errorMessage: '' }
    case 'success':
      if (action.requestId !== state.requestId) return state
      return { ...state, status: 'ready', data: action.data, errorMessage: '' }
    case 'failure':
      if (action.requestId !== state.requestId) return state
      return { ...state, status: 'error', errorMessage: action.message }
    default:
      return state
  }
}
