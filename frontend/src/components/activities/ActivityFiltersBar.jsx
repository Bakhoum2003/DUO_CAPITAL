import { RotateLeftIcon } from '../../icons'
import { SORT_OPTIONS, STATUS_FILTER_OPTIONS } from '../../utils/activitiesViewModel'
import ActionButton from '../common/ActionButton'
import SearchInput from '../common/SearchInput'
import SelectField from '../common/SelectField'

function ActivityFiltersBar({ filters, searchText, onSearchChange, onFilterChange, onReset, hasActiveFilters, categoryOptions }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SearchInput id="activity-search" label="Rechercher une activité par nom" placeholder="Rechercher une activité…" value={searchText} onChange={(event) => onSearchChange(event.target.value)} onClear={() => onSearchChange('')} />
        <SelectField id="activity-status" label="Filtrer par statut" value={filters.status} onChange={(event) => onFilterChange('status', event.target.value)} options={STATUS_FILTER_OPTIONS} />
        <SelectField id="activity-category" label="Filtrer par catégorie" value={filters.category} onChange={(event) => onFilterChange('category', event.target.value)} options={categoryOptions} />
        <SelectField id="activity-sort" label="Trier les activités" value={filters.sort} onChange={(event) => onFilterChange('sort', event.target.value)} options={SORT_OPTIONS} />
      </div>
      {hasActiveFilters && <ActionButton label="Réinitialiser les filtres" icon={RotateLeftIcon} variant="secondary" size="sm" onClick={onReset} />}
    </div>
  )
}

export default ActivityFiltersBar
