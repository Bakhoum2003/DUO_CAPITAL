import { RotateLeftIcon } from '../../icons'
import { SORT_OPTIONS } from '../../constants/contributionSettings'
import ActionButton from '../common/ActionButton'
import SearchInput from '../common/SearchInput'
import SelectField from '../common/SelectField'

function ContributionFilters({ filters, onFilterChange, onReset, hasActiveFilters, associateOptions, monthOptions }) {
  return (
    <div className="mb-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_1fr_1fr_1.2fr]">
        <div className="sm:col-span-2 xl:col-span-1">
          <SearchInput
            id="contribution-search"
            label="Rechercher une cotisation"
            value={filters.search}
            onChange={(event) => onFilterChange('search', event.target.value)}
            onClear={() => onFilterChange('search', '')}
            placeholder="Rechercher…"
          />
        </div>

        <SelectField
          id="contribution-filter-associate"
          label="Filtrer par associé"
          value={filters.associateId}
          onChange={(event) => onFilterChange('associateId', event.target.value)}
          options={associateOptions}
        />

        <SelectField
          id="contribution-filter-month"
          label="Filtrer par mois"
          value={filters.monthKey}
          onChange={(event) => onFilterChange('monthKey', event.target.value)}
          options={monthOptions}
        />

        <SelectField
          id="contribution-sort"
          label="Trier par date"
          value={filters.sortOrder}
          onChange={(event) => onFilterChange('sortOrder', event.target.value)}
          options={SORT_OPTIONS}
        />
      </div>

      {hasActiveFilters && (
        <ActionButton label="Réinitialiser les filtres" icon={RotateLeftIcon} variant="secondary" size="sm" onClick={onReset} />
      )}
    </div>
  )
}

export default ContributionFilters
