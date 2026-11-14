import { RotateLeftIcon } from '../../icons'
import { DIRECTION_OPTIONS, PERIOD_OPTIONS, SORT_OPTIONS, TYPE_OPTIONS } from '../../utils/historyViewModel'
import ActionButton from '../common/ActionButton'
import DateInput from '../common/DateInput'
import SearchInput from '../common/SearchInput'
import SelectField from '../common/SelectField'

/**
 * Recherche, filtres combinables (type, associé, activité, sens, période, dates) et tri : tout est exécuté par l'API.
 * Props : filters, searchText, onSearchChange(texte), onFilterChange(nom, valeur), onReset, hasActiveFilters, partnerOptions, activityOptions, errorMessage.
 */
function OperationsFiltersBar({ filters, searchText, onSearchChange, onFilterChange, onReset, hasActiveFilters, partnerOptions, activityOptions, errorMessage }) {
  const change = (name) => (event) => onFilterChange(name, event.target.value)
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SearchInput id="history-search" label="Rechercher une opération" placeholder="Rechercher (description, type, associé, activité…)" value={searchText} onChange={(event) => onSearchChange(event.target.value)} onClear={() => onSearchChange('')} />
        <SelectField id="history-type" label="Filtrer par type d'opération" value={filters.type} onChange={change('type')} options={TYPE_OPTIONS} />
        <SelectField id="history-partner" label="Filtrer par associé" value={filters.partnerId} onChange={change('partnerId')} options={partnerOptions} />
        <SelectField id="history-activity" label="Filtrer par activité commerciale" value={filters.activityId} onChange={change('activityId')} options={activityOptions} />
        <SelectField id="history-direction" label="Filtrer entrées ou sorties" value={filters.direction} onChange={change('direction')} options={DIRECTION_OPTIONS} />
        <SelectField id="history-period" label="Filtrer par période" value={filters.period} onChange={change('period')} options={PERIOD_OPTIONS} />
        <DateInput id="history-from" label="Date de début" value={filters.from} onChange={change('from')} />
        <DateInput id="history-to" label="Date de fin" value={filters.to} onChange={change('to')} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SelectField id="history-sort" label="Trier les opérations" value={filters.sort} onChange={change('sort')} options={SORT_OPTIONS} />
      </div>
      {errorMessage && <p role="alert" className="text-sm font-medium text-danger-600">{errorMessage}</p>}
      {hasActiveFilters && <ActionButton label="Réinitialiser les filtres" icon={RotateLeftIcon} variant="secondary" size="sm" onClick={onReset} />}
    </div>
  )
}

export default OperationsFiltersBar
