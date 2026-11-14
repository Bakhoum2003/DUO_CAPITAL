import { useCallback, useState } from 'react'

const INITIAL_FILTERS = {
  search: '',
  type: '',
  associateId: '',
  businessId: '',
  startDate: '',
  endDate: '',
  sortOrder: 'date-desc',
}

/**
 * Gère la recherche, les filtres (type, associé, activité, période) et le tri de l'historique.
 * Retourne { filters, setFilter(nom, valeur), resetFilters(), hasActiveFilters }.
 */
export default function useHistoryFilters() {
  const [filters, setFilters] = useState(INITIAL_FILTERS)

  const setFilter = useCallback((name, value) => {
    setFilters((previous) => ({ ...previous, [name]: value }))
  }, [])

  // Réinitialise la recherche et les filtres ; le tri choisi est conservé.
  const resetFilters = useCallback(() => {
    setFilters((previous) => ({ ...INITIAL_FILTERS, sortOrder: previous.sortOrder }))
  }, [])

  const hasActiveFilters = Object.entries(filters).some(
    ([name, value]) => name !== 'sortOrder' && String(value).trim() !== '',
  )

  return { filters, setFilter, resetFilters, hasActiveFilters }
}
