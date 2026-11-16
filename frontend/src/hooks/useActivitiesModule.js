import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { activitiesApi } from '../services/activitiesApi'
import { DEFAULT_FILTERS } from '../utils/activitiesViewModel'
import { getErrorMessage } from '../utils/apiErrors'
import { IDLE_MUTATION, runMutation } from './activityMutation'
import { dashboardReducer as loadReducer, initialDashboardState } from './dashboardState'

const SEARCH_DELAY_MS = 350

export default function useActivitiesModule() {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS })
  const [searchText, setSearchText] = useState('')
  const [list, dispatch] = useReducer(loadReducer, initialDashboardState)
  const [mutation, setMutation] = useState(IDLE_MUTATION)
  const counter = useRef(0)
  const guard = useRef(false)

  const load = useCallback(() => {
    const requestId = ++counter.current
    dispatch({ type: 'request', requestId })
    activitiesApi
      .list(filters)
      .then((data) => dispatch({ type: 'success', requestId, data }))
      .catch((error) => dispatch({ type: 'failure', requestId, message: getErrorMessage(error) }))
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const timerId = setTimeout(() => {
      const search = searchText.trim()
      setFilters((previous) => (previous.search === search ? previous : { ...previous, search, page: 1 }))
    }, SEARCH_DELAY_MS)
    return () => clearTimeout(timerId)
  }, [searchText])

  const meta = list.data?.meta
  const isEmptyPage = Boolean(list.data) && list.data.data.activities.length === 0
  useEffect(() => {
    if (isEmptyPage && meta && meta.page > 1 && meta.totalPages >= 1 && meta.page > meta.totalPages) {
      setFilters((previous) => ({ ...previous, page: meta.totalPages }))
    }
  }, [isEmptyPage, meta])

  const setFilter = useCallback((name, value) => setFilters((previous) => ({ ...previous, [name]: value, page: 1 })), [])
  const setPage = useCallback((page) => setFilters((previous) => ({ ...previous, page })), [])
  const resetFilters = useCallback(() => {
    setSearchText('')
    setFilters({ ...DEFAULT_FILTERS })
  }, [])
  const resetMutation = useCallback(() => setMutation(IDLE_MUTATION), [])

  const mutate = useCallback(
    async (call) => {
      const result = await runMutation(call, { guard, setMutation })
      if (result.ok) load()
      return result.ok
    },
    [load],
  )

  const create = useCallback((payload) => mutate(() => activitiesApi.create(payload)), [mutate])
  const update = useCallback((id, payload) => mutate(() => activitiesApi.update(id, payload)), [mutate])
  const transition = useCallback((id, action, input) => mutate(() => activitiesApi.transition(id, action, input)), [mutate])

  return { filters, searchText, setSearchText, setFilter, setPage, resetFilters, list, refresh: load, mutation, resetMutation, create, update, transition }
}
