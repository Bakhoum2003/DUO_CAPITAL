import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { activitiesApi } from '../services/activitiesApi'
import { getErrorMessage } from '../utils/apiErrors'
import { IDLE_MUTATION, runMutation } from './activityMutation'
import { dashboardReducer as loadReducer, initialDashboardState } from './dashboardState'

/** Détail d'une activité : lecture, modification et changements de statut via l'API. Relit après chaque écriture. */
export default function useActivityDetail(activityId) {
  const [state, dispatch] = useReducer(loadReducer, initialDashboardState)
  const [mutation, setMutation] = useState(IDLE_MUTATION)
  const [errorStatus, setErrorStatus] = useState(0)
  const counter = useRef(0)
  const guard = useRef(false)

  const load = useCallback(() => {
    const requestId = ++counter.current
    dispatch({ type: 'request', requestId })
    activitiesApi
      .get(activityId)
      .then((data) => {
        setErrorStatus(0)
        dispatch({ type: 'success', requestId, data })
      })
      .catch((error) => {
        if (requestId === counter.current) setErrorStatus(Number(error?.status) || 0)
        dispatch({ type: 'failure', requestId, message: getErrorMessage(error) })
      })
  }, [activityId])

  useEffect(() => {
    load()
  }, [load])

  const resetMutation = useCallback(() => setMutation(IDLE_MUTATION), [])
  const mutate = useCallback(
    async (call) => {
      const result = await runMutation(call, { guard, setMutation })
      if (result.ok) load()
      return result.ok
    },
    [load],
  )
  const update = useCallback((payload) => mutate(() => activitiesApi.update(activityId, payload)), [mutate, activityId])
  const transition = useCallback((action, input) => mutate(() => activitiesApi.transition(activityId, action, input)), [mutate, activityId])

  return { status: state.status, activity: state.data?.activity ?? null, errorMessage: state.errorMessage, errorStatus, refresh: load, mutation, resetMutation, update, transition }
}
