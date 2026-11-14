import { formatCurrency, formatSignedAmount } from '../../utils/formatters'
import StatusBadge from '../common/StatusBadge'

/**
 * Résultat d'une activité sur la période.
 *
 * Props :
 * - name : nom de l'activité
 * - statusLabel : statut de l'activité (« En cours », « Terminée »…)
 * - invested, expenses, revenues : montants en FCFA
 * - result : résultat = recettes − dépenses − investissements (FCFA)
 * - assessmentLabel, assessmentTone : jugement affiché (« Rentable », « Résultat provisoire »…)
 */
function ActivityAnalysisItem({ name, statusLabel, invested, expenses, revenues, result, assessmentLabel, assessmentTone }) {
  const resultColor = result > 0 ? 'text-brand-700' : result < 0 ? 'text-danger-600' : 'text-ink'

  return (
    <li className="rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-ink">{name}</h3>
          <p className="text-sm text-ink-soft">{statusLabel}</p>
        </div>
        <StatusBadge label={assessmentLabel} tone={assessmentTone} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-ink-soft">Investi</dt>
          <dd className="font-semibold text-ink">{formatCurrency(invested)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Dépenses</dt>
          <dd className="font-semibold text-ink">{formatCurrency(expenses)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Recettes</dt>
          <dd className="font-semibold text-ink">{formatCurrency(revenues)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Résultat</dt>
          <dd className={`font-extrabold ${resultColor}`}>{result === 0 ? formatCurrency(0) : `${formatSignedAmount(result)} FCFA`}</dd>
        </div>
      </dl>
    </li>
  )
}

export default ActivityAnalysisItem
