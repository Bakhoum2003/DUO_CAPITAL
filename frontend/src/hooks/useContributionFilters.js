import { useCallback, useState } from 'react'

const INITIAL_FILTERS = { search: '', associateId: '', monthKey: '', sortOrder: 'date-desc' }

export default function useContributionFilters() {
  const [filters, setFilters] = useState(INITIAL_FILTERS)

  const setFilter = useCallback((name, value) => {
    setFilters((previous) => ({ ...previous, [name]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters((previous) => ({ ...INITIAL_FILTERS, sortOrder: previous.sortOrder }))
  }, [])

  const hasActiveFilters = filters.search.trim() !== '' || filters.associateId !== '' || filters.monthKey !== ''

  return { filters, setFilter, resetFilters, hasActiveFilters }
}
