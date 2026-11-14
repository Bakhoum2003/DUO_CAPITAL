import { useCallback, useState } from 'react'

const INITIAL_FILTERS = { search: '', associateId: '', monthKey: '', sortOrder: 'date-desc' }

/**
 * Gère la recherche, les filtres (associé, mois) et le tri de l'historique des cotisations.
 * Retourne { filters, setFilter(nom, valeur), resetFilters(), hasActiveFilters }.
 */
export default function useContributionFilters() {
  const [filters, setFilters] = useState(INITIAL_FILTERS)

  const setFilter = useCallback((name, value) => {
    setFilters((previous) => ({ ...previous, [name]: value }))
  }, [])

  // Réinitialise la recherche et les filtres ; le tri choisi est conservé.
  const resetFilters = useCallback(() => {
    setFilters((previous) => ({ ...INITIAL_FILTERS, sortOrder: previous.sortOrder }))
  }, [])

  const hasActiveFilters = filters.search.trim() !== '' || filters.associateId !== '' || filters.monthKey !== ''

  return { filters, setFilter, resetFilters, hasActiveFilters }
}
