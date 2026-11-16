import { RotateLeftIcon } from '../../icons'
import { BUSINESS_SORT_OPTIONS } from '../../constants/businessSettings'
import ActionButton from '../common/ActionButton'
import SearchInput from '../common/SearchInput'
import SelectField from '../common/SelectField'

function BusinessFilters({ filters, onFilterChange, onReset, hasActiveFilters, categoryOptions, statusOptions }) {
  return (
    <div className="mb-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_1fr_1fr_1.3fr]">
        <div className="sm:col-span-2 xl:col-span-1">
          <SearchInput
            id="business-search"
            label="Rechercher un business"
            value={filters.search}
            onChange={(event) => onFilterChange('search', event.target.value)}
            onClear={() => onFilterChange('search', '')}
            placeholder="Rechercher…"
          />
        </div>

        <SelectField
          id="business-filter-category"
          label="Filtrer par catégorie"
          value={filters.category}
          onChange={(event) => onFilterChange('category', event.target.value)}
          options={categoryOptions}
        />

        <SelectField
          id="business-filter-status"
          label="Filtrer par statut"
          value={filters.status}
          onChange={(event) => onFilterChange('status', event.target.value)}
          options={statusOptions}
        />

        <SelectField
          id="business-sort"
          label="Trier les business"
          value={filters.sortOrder}
          onChange={(event) => onFilterChange('sortOrder', event.target.value)}
          options={BUSINESS_SORT_OPTIONS}
        />
      </div>

      {hasActiveFilters && (
        <ActionButton label="Réinitialiser les filtres" icon={RotateLeftIcon} variant="secondary" size="sm" onClick={onReset} />
      )}
    </div>
  )
}

export default BusinessFilters
