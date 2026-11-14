import { Link } from 'react-router-dom'
import { DIRECTIONS, HISTORY_TYPES } from '../../constants/historySettings'
import { getBusinessDetailsPath } from '../../routes/routePaths'
import { formatCurrency, formatLongDate, formatSignedAmount } from '../../utils/formatters'
import StatusBadge from '../common/StatusBadge'
import HistoryAmount from './HistoryAmount'
import HistoryEntryIcon from './HistoryEntryIcon'

function toDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Contenu détaillé d'un mouvement : montant, date, type, description, activité, associé
 * et informations complémentaires (catégorie de dépense, calcul d'un bénéfice, origine).
 *
 * Props :
 * - entry : le mouvement { type, direction, amount, date, description, businessId, businessName,
 *   associateName, details }
 */
function HistoryEntryDetails({ entry }) {
  const typeStyle = HISTORY_TYPES[entry.type]
  const directionStyle = DIRECTIONS[entry.direction]
  const { details } = entry
  const financials = details.financials

  return (
    <div>
      <div className="flex items-center gap-4">
        <HistoryEntryIcon type={entry.type} direction={entry.direction} size="lg" />
        <div className="min-w-0">
          <p className="text-2xl">
            <HistoryAmount direction={entry.direction} amount={entry.amount} />
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">{typeStyle.label}</span>
            <StatusBadge label={directionStyle.label} tone={directionStyle.badgeTone} />
          </div>
        </div>
      </div>

      <dl className="mt-5 grid gap-4 border-t border-line pt-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink-soft">Date</dt>
          <dd className="font-semibold text-ink">{formatLongDate(toDate(entry.date))}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Origine</dt>
          <dd className="font-semibold text-ink">{details.sourceLabel}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-ink-soft">Description</dt>
          <dd className="text-ink">{entry.description}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Activité commerciale</dt>
          <dd className="font-semibold text-ink">
            {entry.businessId ? (
              <Link
                to={getBusinessDetailsPath(entry.businessId)}
                className="text-brand-600 transition hover:text-brand-700 hover:underline"
              >
                {entry.businessName}
              </Link>
            ) : (
              'Aucune'
            )}
          </dd>
        </div>
        <div>
          <dt className="text-ink-soft">Associé concerné</dt>
          <dd className="font-semibold text-ink">{entry.associateName || 'Non précisé'}</dd>
        </div>
        {details.categoryLabel && (
          <div className="sm:col-span-2">
            <dt className="text-ink-soft">Catégorie de dépense</dt>
            <dd className="font-semibold text-ink">{details.categoryLabel}</dd>
          </div>
        )}
      </dl>

      {details.isInitialInvestment && (
        <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm text-ink-soft">
          Investissement de départ de l'activité, enregistré à sa date de lancement.
        </p>
      )}

      {financials && (
        <div className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm">
          <p className="font-semibold text-ink">Calcul du résultat de l'activité</p>
          <ul className="mt-2 space-y-1 text-ink-soft">
            <li>Recettes : {formatCurrency(financials.totalRevenues)}</li>
            <li>Dépenses : − {formatCurrency(financials.totalExpenses)}</li>
            <li>Total investi : − {formatCurrency(financials.totalInvested)}</li>
            <li className="font-bold text-ink">Résultat : {formatSignedAmount(details.result)} FCFA</li>
          </ul>
          <p className="mt-3 text-ink-soft">
            Ce résultat est calculé : ce n’est pas une entrée d’argent et il n’est pas compté dans les totaux, car
            ses recettes et ses dépenses y figurent déjà. Aucun partage automatique entre les associés.
          </p>
        </div>
      )}
    </div>
  )
}

export default HistoryEntryDetails
