
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
