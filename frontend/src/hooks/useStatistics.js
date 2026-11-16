import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { statisticsApi } from '../services/statisticsApi'
import { getErrorMessage } from '../utils/apiErrors'
import { adaptStatistics, deriveStatus, periodCacheKey, selectForKey, validatePeriod } from '../utils/statisticsViewModel'
import { dashboardReducer, initialDashboardState } from './dashboardState'

export default function useStatistics({ periodKey, customStartDate, customEndDate }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialDashboardState)
  const counter = useRef(0)
  const periodError = validatePeriod({ periodKey, customStartDate, customEndDate })
  const key = periodCacheKey({ periodKey, customStartDate, customEndDate })

  const load = useCallback(() => {
    if (validatePeriod({ periodKey, customStartDate, customEndDate })) return
    const requestId = ++counter.current
    dispatch({ type: 'request', requestId })
    statisticsApi
      .get({ periodKey, customStartDate, customEndDate })
      .then((payload) => dispatch({ type: 'success', requestId, data: { key, payload } }))
      .catch((error) => dispatch({ type: 'failure', requestId, message: getErrorMessage(error) }))
  }, [periodKey, customStartDate, customEndDate, key])

  useEffect(() => {
    load()
  }, [load])

  const payload = periodError ? null : selectForKey(state.data, key)
  const stats = useMemo(() => (payload ? adaptStatistics(payload) : null), [payload])
  const status = deriveStatus({ periodError, loadStatus: state.status, hasData: Boolean(stats) })

  return { status, stats, errorMessage: !periodError && state.status === 'error' ? state.errorMessage : '', periodError, refresh: load }
}
