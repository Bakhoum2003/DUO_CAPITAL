import { useCallback, useEffect, useReducer, useRef } from 'react'
import { withdrawalsApi } from '../services/withdrawalsApi'
import { getErrorMessage } from '../utils/apiErrors'
import { dashboardReducer, initialDashboardState } from './dashboardState'

/** Détail d'un retrait lu auprès de l'API (à monter uniquement quand un retrait est sélectionné). */
export default function useWithdrawalDetail(id) {
  const [state, dispatch] = useReducer(dashboardReducer, initialDashboardState)
  const counter = useRef(0)

  const load = useCallback(() => {
    const requestId = ++counter.current
    dispatch({ type: 'request', requestId })
    withdrawalsApi
      .get(id)
      .then((data) => dispatch({ type: 'success', requestId, data }))
      .catch((error) => dispatch({ type: 'failure', requestId, message: getErrorMessage(error) }))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  return { status: state.status, withdrawal: state.data?.withdrawal ?? null, errorMessage: state.errorMessage, retry: load }
}
