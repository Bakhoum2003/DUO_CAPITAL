import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { withdrawalsApi } from '../services/withdrawalsApi'
import { getErrorMessage } from '../utils/apiErrors'
import { createWithdrawalActions, IDLE_MUTATION } from '../utils/withdrawalsActions'
import { DEFAULT_FILTERS, validateFilters } from '../utils/withdrawalsViewModel'
import { dashboardReducer as loadReducer, initialDashboardState } from './dashboardState'

const SEARCH_DELAY_MS = 350

/**
 * Module Retraits : indicateurs (/summary), liste filtrée, triée et paginée par l'API, et écritures
 * (création, modification, suppression logique). Les réponses périmées sont ignorées ; après chaque écriture réussie,
 * indicateurs, solde et liste sont relus auprès du serveur (aucune donnée financière obsolète, aucune simulation locale).
 */
export default function useWithdrawalsModule() {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS })
  const [searchText, setSearchText] = useState('')
  const [summary, dispatchSummary] = useReducer(loadReducer, initialDashboardState)
  const [list, dispatchList] = useReducer(loadReducer, initialDashboardState)
  const [mutation, setMutation] = useState(IDLE_MUTATION)
  const counters = useRef({ summary: 0, list: 0 })

  const loadSummary = useCallback(() => {
    const requestId = ++counters.current.summary
    dispatchSummary({ type: 'request', requestId })
    withdrawalsApi
      .summary()
      .then((data) => dispatchSummary({ type: 'success', requestId, data }))
      .catch((error) => dispatchSummary({ type: 'failure', requestId, message: getErrorMessage(error) }))
  }, [])

  const filtersError = validateFilters(filters)
  const loadList = useCallback(() => {
    if (validateFilters(filters)) return
    const requestId = ++counters.current.list
    dispatchList({ type: 'request', requestId })
    withdrawalsApi
      .list(filters)
      .then((data) => dispatchList({ type: 'success', requestId, data }))
      .catch((error) => dispatchList({ type: 'failure', requestId, message: getErrorMessage(error) }))
  }, [filters])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])
  useEffect(() => {
    loadList()
  }, [loadList])

  // La recherche part vers l'API après une courte pause de saisie.
  useEffect(() => {
    const timerId = setTimeout(() => {
      const search = searchText.trim()
      setFilters((previous) => (previous.search === search ? previous : { ...previous, search, page: 1 }))
    }, SEARCH_DELAY_MS)
    return () => clearTimeout(timerId)
  }, [searchText])

  const setFilter = useCallback((name, value) => setFilters((previous) => ({ ...previous, [name]: value, page: 1 })), [])
  const setPage = useCallback((page) => setFilters((previous) => ({ ...previous, page })), [])
  const resetFilters = useCallback(() => {
    setSearchText('')
    setFilters({ ...DEFAULT_FILTERS })
  }, [])
  const refresh = useCallback(() => {
    loadSummary()
    loadList()
  }, [loadSummary, loadList])

  const refreshRef = useRef(refresh)
  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])
  const actions = useMemo(() => createWithdrawalActions({ api: withdrawalsApi, setMutation, refresh: () => refreshRef.current() }), [])
  const clearMutation = useCallback(() => setMutation(IDLE_MUTATION), [])

  return { filters, filtersError, searchText, setSearchText, setFilter, setPage, resetFilters, summary, list, refresh, mutation, clearMutation, actions }
}
