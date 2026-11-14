import { RotateLeftIcon } from '../../icons'
import { SORT_OPTIONS } from '../../utils/withdrawalsViewModel'
import ActionButton from '../common/ActionButton'
import DateInput from '../common/DateInput'
import SearchInput from '../common/SearchInput'
import SelectField from '../common/SelectField'

/**
 * Recherche, filtres (bénéficiaire, auteur, période) et tri : tout est exécuté par l'API.
 * Props : filters, searchText, onSearchChange(texte), onFilterChange(nom, valeur), onReset, hasActiveFilters, beneficiaryOptions, authorOptions, errorMessage.
 */
function WithdrawalFiltersBar({ filters, searchText, onSearchChange, onFilterChange, onReset, hasActiveFilters, beneficiaryOptions, authorOptions, errorMessage }) {
  const change = (name) => (event) => onFilterChange(name, event.target.value)
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SearchInput id="withdrawal-search" label="Rechercher un retrait" placeholder="Rechercher (motif, associé, montant…)" value={searchText} onChange={(event) => onSearchChange(event.target.value)} onClear={() => onSearchChange('')} />
        <SelectField id="withdrawal-beneficiary" label="Filtrer par bénéficiaire" value={filters.beneficiaryId} onChange={change('beneficiaryId')} options={beneficiaryOptions} />
        <SelectField id="withdrawal-author" label="Filtrer par auteur" value={filters.authorId} onChange={change('authorId')} options={authorOptions} />
        <SelectField id="withdrawal-sort" label="Trier les retraits" value={filters.sort} onChange={change('sort')} options={SORT_OPTIONS} />
        <DateInput id="withdrawal-from" label="Du" value={filters.from} onChange={change('from')} />
        <DateInput id="withdrawal-to" label="Au" value={filters.to} onChange={change('to')} />
      </div>
      {errorMessage && <p role="alert" className="text-sm font-medium text-danger-600">{errorMessage}</p>}
      {hasActiveFilters && <ActionButton label="Réinitialiser les filtres" icon={RotateLeftIcon} variant="secondary" size="sm" onClick={onReset} />}
    </div>
  )
}

export default WithdrawalFiltersBar
