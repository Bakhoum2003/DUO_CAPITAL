import { RotateLeftIcon } from '../../icons'
import { HISTORY_SORT_OPTIONS } from '../../constants/historySettings'
import ActionButton from '../common/ActionButton'
import DateInput from '../common/DateInput'
import FormError from '../common/FormError'
import SearchInput from '../common/SearchInput'
import SelectField from '../common/SelectField'

function HistoryFilters({
  filters,
  onFilterChange,
  onReset,
  hasActiveFilters,
  typeOptions,
  associateOptions,
  businessOptions,
  periodError,
}) {
  return (
    <div className="mb-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="sm:col-span-2 xl:col-span-1">
          <SearchInput
            id="history-search"
            label="Rechercher dans l'historique"
            value={filters.search}
            onChange={(event) => onFilterChange('search', event.target.value)}
            onClear={() => onFilterChange('search', '')}
            placeholder="Rechercher une description…"
          />
        </div>
        <SelectField
          id="history-filter-type"
          label="Filtrer par type d'opération"
          value={filters.type}
          onChange={(event) => onFilterChange('type', event.target.value)}
          options={typeOptions}
        />
        <SelectField
          id="history-filter-associate"
          label="Filtrer par associé"
          value={filters.associateId}
          onChange={(event) => onFilterChange('associateId', event.target.value)}
          options={associateOptions}
        />
        <SelectField
          id="history-filter-business"
          label="Filtrer par activité commerciale"
          value={filters.businessId}
          onChange={(event) => onFilterChange('businessId', event.target.value)}
          options={businessOptions}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DateInput
          id="history-start-date"
          label="Période : du"
          value={filters.startDate}
          onChange={(event) => onFilterChange('startDate', event.target.value)}
        />
        <DateInput
          id="history-end-date"
          label="Au"
          value={filters.endDate}
          onChange={(event) => onFilterChange('endDate', event.target.value)}
        />
        <div className="sm:col-span-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Tri</p>
          <SelectField
            id="history-sort"
            label="Trier par date"
            value={filters.sortOrder}
            onChange={(event) => onFilterChange('sortOrder', event.target.value)}
            options={HISTORY_SORT_OPTIONS}
          />
        </div>
      </div>

      <FormError id="history-period-error" message={periodError} variant="banner" />

      {hasActiveFilters && (
        <ActionButton label="Réinitialiser les filtres" icon={RotateLeftIcon} variant="secondary" size="sm" onClick={onReset} />
      )}
    </div>
  )
}

export default HistoryFilters
