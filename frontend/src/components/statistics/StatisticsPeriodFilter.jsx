import { RotateLeftIcon } from '../../icons'
import { PERIOD_OPTIONS } from '../../constants/statisticsSettings'
import ActionButton from '../common/ActionButton'
import DateInput from '../common/DateInput'
import FormError from '../common/FormError'
import SelectField from '../common/SelectField'

/**
 * Filtre de période des statistiques : périodes prédéfinies ou dates personnalisées.
 *
 * Props :
 * - periodKey : période choisie ('week', 'month', '3months', '6months', 'year', 'all', 'custom')
 * - customStartDate, customEndDate : dates de la période personnalisée (« AAAA-MM-JJ » ou « »)
 * - onPeriodChange : fonction (valeur) appelée au choix d'une période
 * - onStartDateChange, onEndDateChange : fonctions (valeur) pour les dates personnalisées
 * - onReset : fonction appelée au clic sur « Réinitialiser »
 * - canReset : affiche le bouton « Réinitialiser » quand la période n'est pas celle par défaut
 * - periodLabel : texte décrivant la période appliquée (ex. « Du 01/11/2026 au 12/11/2026 »)
 * - periodError : message d'erreur de la période personnalisée (vide = correcte)
 */
function StatisticsPeriodFilter({
  periodKey,
  customStartDate,
  customEndDate,
  onPeriodChange,
  onStartDateChange,
  onEndDateChange,
  onReset,
  canReset,
  periodLabel,
  periodError,
}) {
  return (
    <section aria-label="Période des statistiques" className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Période</p>
          <SelectField
            id="statistics-period"
            label="Choisir la période"
            value={periodKey}
            onChange={(event) => onPeriodChange(event.target.value)}
            options={PERIOD_OPTIONS}
          />
        </div>

        {periodKey === 'custom' && (
          <>
            <DateInput
              id="statistics-start-date"
              label="Du"
              value={customStartDate}
              onChange={(event) => onStartDateChange(event.target.value)}
            />
            <DateInput
              id="statistics-end-date"
              label="Au"
              value={customEndDate}
              onChange={(event) => onEndDateChange(event.target.value)}
            />
          </>
        )}
      </div>

      <FormError id="statistics-period-error" message={periodError} variant="banner" />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          Période affichée : <span className="font-semibold text-ink">{periodLabel}</span>
        </p>
        {canReset && <ActionButton label="Réinitialiser" icon={RotateLeftIcon} variant="secondary" size="sm" onClick={onReset} />}
      </div>
    </section>
  )
}

export default StatisticsPeriodFilter
