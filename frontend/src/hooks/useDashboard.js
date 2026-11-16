import { useCallback, useEffect, useReducer, useRef } from 'react'
import { getDashboard } from '../services/dashboardService'
import { getErrorMessage } from '../utils/apiErrors'
import { isFilterReady } from '../utils/dashboardViewModel'
import { dashboardReducer, initialDashboardState } from './dashboardState'

export default function useDashboard(filter) {
  const [state, dispatch] = useReducer(dashboardReducer, initialDashboardState)
  const counter = useRef(0)
  const { period, from, to } = filter
  const ready = isFilterReady(filter)

  const load = useCallback(() => {
    if (!ready) return
    const requestId = ++counter.current
    dispatch({ type: 'request', requestId })
    getDashboard({ period, from, to })
      .then((data) => dispatch({ type: 'success', requestId, data }))
      .catch((error) => dispatch({ type: 'failure', requestId, message: getErrorMessage(error) }))
  }, [period, from, to, ready])

  useEffect(() => {
    load()
  }, [load])

  return { status: state.status, data: state.data, errorMessage: state.errorMessage, refresh: load }
}
