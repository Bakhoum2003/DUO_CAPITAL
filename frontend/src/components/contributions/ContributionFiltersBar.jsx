import { RotateLeftIcon } from '../../icons'
import ActionButton from '../common/ActionButton'
import SelectField from '../common/SelectField'

const dateClasses = 'h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20'

/**
 * Filtres de l'historique (agissent réellement sur l'API) : associé, mois, année, période de dates.
 * Props : filters, onFilterChange(nom, valeur), onReset, hasActiveFilters, partnerOptions, periodOptions, yearOptions, errorMessage.
 */
function ContributionFiltersBar({ filters, onFilterChange, onReset, hasActiveFilters, partnerOptions, periodOptions, yearOptions, errorMessage }) {
  return (
    <div className="mb-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SelectField id="cf-partner" label="Filtrer par associé" value={filters.partnerId} onChange={(event) => onFilterChange('partnerId', event.target.value)} options={partnerOptions} />
        <SelectField id="cf-period" label="Filtrer par mois concerné" value={filters.period} onChange={(event) => onFilterChange('period', event.target.value)} options={periodOptions} />
        <SelectField id="cf-year" label="Filtrer par année" value={filters.year} onChange={(event) => onFilterChange('year', event.target.value)} options={yearOptions} />
        <div>
          <label htmlFor="cf-from" className="sr-only">Versements à partir du</label>
          <input id="cf-from" type="date" value={filters.from} onChange={(event) => onFilterChange('from', event.target.value)} className={dateClasses} aria-label="Versements à partir du" />
        </div>
        <div>
          <label htmlFor="cf-to" className="sr-only">Versements jusqu'au</label>
          <input id="cf-to" type="date" value={filters.to} onChange={(event) => onFilterChange('to', event.target.value)} className={dateClasses} aria-label="Versements jusqu'au" />
        </div>
      </div>
      {errorMessage && <p role="alert" className="text-sm font-medium text-danger-600">{errorMessage}</p>}
      {hasActiveFilters && <ActionButton label="Réinitialiser les filtres" icon={RotateLeftIcon} variant="secondary" size="sm" onClick={onReset} />}
    </div>
  )
}

export default ContributionFiltersBar
