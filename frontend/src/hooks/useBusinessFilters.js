import { useCallback, useState } from 'react'

const INITIAL_FILTERS = { search: '', category: '', status: '', sortOrder: 'date-desc' }

/**
 * Gère la recherche, les filtres (catégorie, statut) et le tri de la liste des business.
 * Retourne { filters, setFilter(nom, valeur), resetFilters(), hasActiveFilters }.
 */
export default function useBusinessFilters() {
  const [filters, setFilters] = useState(INITIAL_FILTERS)

  const setFilter = useCallback((name, value) => {
    setFilters((previous) => ({ ...previous, [name]: value }))
  }, [])

  // Réinitialise la recherche et les filtres ; le tri choisi est conservé.
  const resetFilters = useCallback(() => {
    setFilters((previous) => ({ ...INITIAL_FILTERS, sortOrder: previous.sortOrder }))
  }, [])

  const hasActiveFilters = filters.search.trim() !== '' || filters.category !== '' || filters.status !== ''

  return { filters, setFilter, resetFilters, hasActiveFilters }
}
