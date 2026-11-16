import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { contributionsApi } from '../services/contributionsApi'
import { createContributionSubmitter } from '../utils/contributionSubmitter'
import { buildCreatePayload, DEFAULT_FILTERS, describeCreateError, validateFilters } from '../utils/contributionsViewModel'
import { getErrorMessage } from '../utils/apiErrors'
import { dashboardReducer as loadReducer, initialDashboardState } from './dashboardState'

const IDLE_SUBMISSION = Object.freeze({ status: 'idle', message: '', fieldErrors: {}, needsDuplicateConfirmation: false })

export default function useContributionsModule() {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS })
  const [summary, dispatchSummary] = useReducer(loadReducer, initialDashboardState)
  const [list, dispatchList] = useReducer(loadReducer, initialDashboardState)
  const [submission, setSubmission] = useState(IDLE_SUBMISSION)
  const counters = useRef({ summary: 0, list: 0 })
  const submitter = useRef(null)
  if (submitter.current === null) submitter.current = createContributionSubmitter({ create: contributionsApi.create })

  const loadSummary = useCallback(() => {
    const requestId = ++counters.current.summary
    dispatchSummary({ type: 'request', requestId })
    contributionsApi
      .summary()
      .then((data) => dispatchSummary({ type: 'success', requestId, data }))
      .catch((error) => dispatchSummary({ type: 'failure', requestId, message: getErrorMessage(error) }))
  }, [])

  const filtersError = validateFilters(filters)
  const loadList = useCallback(() => {
    if (validateFilters(filters)) return
    const requestId = ++counters.current.list
    dispatchList({ type: 'request', requestId })
    contributionsApi
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

  const setFilter = useCallback((name, value) => setFilters((previous) => ({ ...previous, [name]: value, page: 1 })), [])
  const setPage = useCallback((page) => setFilters((previous) => ({ ...previous, page })), [])
  const resetFilters = useCallback(() => setFilters({ ...DEFAULT_FILTERS }), [])
  const refresh = useCallback(() => {
    loadSummary()
    loadList()
  }, [loadSummary, loadList])

  const record = useCallback(
    async (values, { confirmDuplicate = false } = {}) => {
      if (submitter.current.isSubmitting()) return false
      setSubmission({ ...IDLE_SUBMISSION, status: 'submitting' })
      const result = await submitter.current.submit(buildCreatePayload(values, { confirmDuplicate }))
      if (!result.ok) {
        setSubmission({ status: 'error', ...describeCreateError(result.error) })
        return false
      }
      setSubmission({ ...IDLE_SUBMISSION, status: 'success', message: 'Cotisation enregistrée.' })
      setFilters({ ...DEFAULT_FILTERS })
      loadSummary()
      return true
    },
    [loadSummary],
  )
  const resetSubmission = useCallback(() => setSubmission(IDLE_SUBMISSION), [])

  return { filters, filtersError, setFilter, setPage, resetFilters, summary, list, refresh, record, submission, resetSubmission }
}
