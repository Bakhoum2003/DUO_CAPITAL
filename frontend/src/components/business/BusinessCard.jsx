import { CalendarDaysIcon, UserIcon } from '../../icons'
import { Link } from 'react-router-dom'
import { getBusinessCategory } from '../../constants/businessSettings'
import { BUSINESS_STATUSES } from '../../constants/statusStyles'
import { formatCurrency, formatShortDate } from '../../utils/formatters'
import StatusBadge from '../common/StatusBadge'
import BusinessCategoryIcon from './BusinessCategoryIcon'
import ResultLabel from './ResultLabel'

function BusinessCard({
  to,
  name,
  category,
  launchDate,
  responsibleName,
  status,
  totalInvested,
  totalExpenses,
  totalRevenues,
  result,
}) {
  const statusStyle = BUSINESS_STATUSES[status]

  return (
    <li>
      <Link
        to={to}
        className="block h-full rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:border-brand-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30"
      >
        <div className="flex items-start gap-3">
          <BusinessCategoryIcon category={category} />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold leading-snug text-ink">{name}</h3>
            <p className="text-sm text-ink-soft">{getBusinessCategory(category).label}</p>
          </div>
          <StatusBadge label={statusStyle.label} tone={statusStyle.tone} />
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
            Lancé le {formatShortDate(launchDate)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UserIcon className="h-4 w-4" aria-hidden="true" />
            {responsibleName || 'Responsable non précisé'}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
          <div>
            <dt className="text-ink-soft">Montant investi</dt>
            <dd className="font-bold text-ink">{formatCurrency(totalInvested)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Total des dépenses</dt>
            <dd className="font-bold text-ink">{formatCurrency(totalExpenses)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Total des recettes</dt>
            <dd className="font-bold text-ink">{formatCurrency(totalRevenues)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Résultat</dt>
            <dd>
              <ResultLabel result={result} />
            </dd>
          </div>
        </dl>
      </Link>
    </li>
  )
}

export default BusinessCard
