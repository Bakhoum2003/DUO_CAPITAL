import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { historyApi } from '../services/historyApi'
import { getErrorMessage } from '../utils/apiErrors'
import { DEFAULT_FILTERS, filtersReducer, validateFilters } from '../utils/historyViewModel'
import { dashboardReducer as loadReducer, initialDashboardState } from './dashboardState'

const SEARCH_DELAY_MS = 350

/**
 * Page Historique : synthèse (/history/summary) et opérations filtrées, triées et paginées par l'API.
 * Les réponses périmées sont ignorées ; une erreur n'efface jamais les dernières données valides ni ne les remplace
 * par des données locales. Lecture seule : aucune écriture n'existe dans ce module.
 */
export default function useHistory() {
  const [filters, dispatchFilters] = useReducer(filtersReducer, DEFAULT_FILTERS)
  const [searchText, setSearchText] = useState('')
  const [summary, dispatchSummary] = useReducer(loadReducer, initialDashboardState)
  const [list, dispatchList] = useReducer(loadReducer, initialDashboardState)
  const counters = useRef({ summary: 0, list: 0 })

  const loadSummary = useCallback(() => {
    const requestId = ++counters.current.summary
    dispatchSummary({ type: 'request', requestId })
    historyApi
      .summary()
      .then((data) => dispatchSummary({ type: 'success', requestId, data }))
      .catch((error) => dispatchSummary({ type: 'failure', requestId, message: getErrorMessage(error) }))
  }, [])

  const filtersError = validateFilters(filters)
  const loadList = useCallback(() => {
    if (validateFilters(filters)) return
    const requestId = ++counters.current.list
    dispatchList({ type: 'request', requestId })
    historyApi
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
      if (search !== filters.search) dispatchFilters({ type: 'set', name: 'search', value: search })
    }, SEARCH_DELAY_MS)
    return () => clearTimeout(timerId)
  }, [searchText, filters.search])

  const setFilter = useCallback((name, value) => dispatchFilters({ type: 'set', name, value }), [])
  const setPage = useCallback((page) => dispatchFilters({ type: 'page', page }), [])
  const resetFilters = useCallback(() => {
    setSearchText('')
    dispatchFilters({ type: 'reset' })
  }, [])
  /** Relit la synthèse ET la liste : toujours les dernières données du serveur. */
  const refresh = useCallback(() => {
    loadSummary()
    loadList()
  }, [loadSummary, loadList])

  return { filters, filtersError, searchText, setSearchText, setFilter, setPage, resetFilters, summary, list, refresh }
}
