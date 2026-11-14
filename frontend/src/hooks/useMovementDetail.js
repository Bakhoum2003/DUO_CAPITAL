import { useCallback, useEffect, useReducer, useRef } from 'react'
import { treasuryApi } from '../services/treasuryApi'
import { getErrorMessage } from '../utils/apiErrors'
import { dashboardReducer, initialDashboardState } from './dashboardState'

/** Détail d'un mouvement lu auprès de l'API (à monter uniquement quand un mouvement est sélectionné). */
export default function useMovementDetail(type, id) {
  const [state, dispatch] = useReducer(dashboardReducer, initialDashboardState)
  const counter = useRef(0)

  const load = useCallback(() => {
    const requestId = ++counter.current
    dispatch({ type: 'request', requestId })
    treasuryApi
      .movement(type, id)
      .then((data) => dispatch({ type: 'success', requestId, data }))
      .catch((error) => dispatch({ type: 'failure', requestId, message: getErrorMessage(error) }))
  }, [type, id])

  useEffect(() => {
    load()
  }, [load])

  return { status: state.status, movement: state.data?.movement ?? null, errorMessage: state.errorMessage, retry: load }
}
