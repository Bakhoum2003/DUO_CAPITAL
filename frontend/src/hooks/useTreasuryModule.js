import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { treasuryApi } from '../services/treasuryApi'
import { getErrorMessage } from '../utils/apiErrors'
import { DEFAULT_FILTERS, validateFilters } from '../utils/treasuryViewModel'
import { dashboardReducer as loadReducer, initialDashboardState } from './dashboardState'

const SEARCH_DELAY_MS = 350

/**
 * Module Trésorerie : synthèse (/summary) et historique filtré, trié et paginé par l'API.
 * Les réponses périmées sont ignorées ; une erreur n'efface jamais les dernières données valides ni ne les remplace par des données locales.
 */
export default function useTreasuryModule() {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS })
  const [searchText, setSearchText] = useState('')
  const [summary, dispatchSummary] = useReducer(loadReducer, initialDashboardState)
  const [list, dispatchList] = useReducer(loadReducer, initialDashboardState)
  const counters = useRef({ summary: 0, list: 0 })

  const loadSummary = useCallback(() => {
    const requestId = ++counters.current.summary
    dispatchSummary({ type: 'request', requestId })
    treasuryApi
      .summary()
      .then((data) => dispatchSummary({ type: 'success', requestId, data }))
      .catch((error) => dispatchSummary({ type: 'failure', requestId, message: getErrorMessage(error) }))
  }, [])

  const filtersError = validateFilters(filters)
  const loadList = useCallback(() => {
    if (validateFilters(filters)) return
    const requestId = ++counters.current.list
    dispatchList({ type: 'request', requestId })
    treasuryApi
      .movements(filters)
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
  /** Relit la synthèse ET l'historique : toujours les dernières données du serveur. */
  const refresh = useCallback(() => {
    loadSummary()
    loadList()
  }, [loadSummary, loadList])

  return { filters, filtersError, searchText, setSearchText, setFilter, setPage, resetFilters, summary, list, refresh }
}
