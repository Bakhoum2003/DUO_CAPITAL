import { useCallback, useEffect, useReducer, useRef } from 'react'
import { historyApi } from '../services/historyApi'
import { getErrorMessage } from '../utils/apiErrors'
import { dashboardReducer, initialDashboardState } from './dashboardState'

/** Détail d'une opération lu auprès de l'API (à monter uniquement quand une opération est sélectionnée). */
export default function useOperationDetail(type, id) {
  const [state, dispatch] = useReducer(dashboardReducer, initialDashboardState)
  const counter = useRef(0)

  const load = useCallback(() => {
    const requestId = ++counter.current
    dispatch({ type: 'request', requestId })
    historyApi
      .detail(type, id)
      .then((data) => dispatch({ type: 'success', requestId, data }))
      .catch((error) => dispatch({ type: 'failure', requestId, message: getErrorMessage(error) }))
  }, [type, id])

  useEffect(() => {
    load()
  }, [load])

  return { status: state.status, operation: state.data?.operation ?? null, errorMessage: state.errorMessage, retry: load }
}
