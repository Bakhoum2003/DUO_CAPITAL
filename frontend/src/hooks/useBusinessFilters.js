import { useCallback, useState } from 'react'

const INITIAL_FILTERS = { search: '', category: '', status: '', sortOrder: 'date-desc' }

export default function useBusinessFilters() {
  const [filters, setFilters] = useState(INITIAL_FILTERS)

  const setFilter = useCallback((name, value) => {
    setFilters((previous) => ({ ...previous, [name]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters((previous) => ({ ...INITIAL_FILTERS, sortOrder: previous.sortOrder }))
  }, [])

  const hasActiveFilters = filters.search.trim() !== '' || filters.category !== '' || filters.status !== ''

  return { filters, setFilter, resetFilters, hasActiveFilters }
}
