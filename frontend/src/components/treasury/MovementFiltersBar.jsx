import { RotateLeftIcon } from '../../icons'
import { DIRECTION_OPTIONS, SORT_OPTIONS, TYPE_OPTIONS } from '../../utils/treasuryViewModel'
import ActionButton from '../common/ActionButton'
import DateInput from '../common/DateInput'
import SearchInput from '../common/SearchInput'
import SelectField from '../common/SelectField'

/**
 * Recherche, filtres (type, sens, catégorie, associé, période) et tri : tout est exécuté par l'API.
 * Props : filters, searchText, onSearchChange(texte), onFilterChange(nom, valeur), onReset, hasActiveFilters, categoryOptions, partnerOptions, errorMessage.
 */
function MovementFiltersBar({ filters, searchText, onSearchChange, onFilterChange, onReset, hasActiveFilters, categoryOptions, partnerOptions, errorMessage }) {
  const change = (name) => (event) => onFilterChange(name, event.target.value)
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SearchInput id="movement-search" label="Rechercher un mouvement" placeholder="Rechercher (description, activité, associé…)" value={searchText} onChange={(event) => onSearchChange(event.target.value)} onClear={() => onSearchChange('')} />
        <SelectField id="movement-type" label="Filtrer par type" value={filters.type} onChange={change('type')} options={TYPE_OPTIONS} />
        <SelectField id="movement-direction" label="Filtrer par sens" value={filters.direction} onChange={change('direction')} options={DIRECTION_OPTIONS} />
        <SelectField id="movement-category" label="Filtrer par catégorie d'activité" value={filters.category} onChange={change('category')} options={categoryOptions} />
        <SelectField id="movement-partner" label="Filtrer par associé" value={filters.partnerId} onChange={change('partnerId')} options={partnerOptions} />
        <DateInput id="movement-from" label="Du" value={filters.from} onChange={change('from')} />
        <DateInput id="movement-to" label="Au" value={filters.to} onChange={change('to')} />
        <SelectField id="movement-sort" label="Trier les mouvements" value={filters.sort} onChange={change('sort')} options={SORT_OPTIONS} />
      </div>
      {errorMessage && <p role="alert" className="text-sm font-medium text-danger-600">{errorMessage}</p>}
      {hasActiveFilters && <ActionButton label="Réinitialiser les filtres" icon={RotateLeftIcon} variant="secondary" size="sm" onClick={onReset} />}
    </div>
  )
}

export default MovementFiltersBar
