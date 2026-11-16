import { CalendarDaysIcon, ChevronRightIcon, TagIcon } from '../../icons'
import { Link } from 'react-router-dom'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { formatShortDate } from '../../utils/formatters'
import ActivityStatusBadge from './ActivityStatusBadge'

function ActivityCard({ activity, to }) {
  return (
    <li>
      <Link to={to} className={`${CARD_CLASSES} block h-full transition hover:border-brand-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30`}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 break-words text-lg font-bold text-ink">{activity.name}</h3>
          <ActivityStatusBadge status={activity.status} />
        </div>

        <p className="mt-2 line-clamp-2 min-h-10 text-sm text-ink-soft">{activity.description || 'Aucune description.'}</p>

        <dl className="mt-4 space-y-1.5 text-sm text-ink-soft">
          <div className="flex items-center gap-2">
            <TagIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Catégorie</dt>
            <dd>{activity.category || 'Sans catégorie'}</dd>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Dates</dt>
            <dd>
              Depuis le {formatShortDate(activity.startDate)}
              {activity.endDate ? ` · terminée le ${formatShortDate(activity.endDate)}` : ''}
            </dd>
          </div>
        </dl>

        <p className="mt-4 flex items-center justify-between text-sm font-semibold text-brand-700">
          <span>{activity.operationsCount === undefined ? 'Voir le détail' : `${activity.operationsCount} opération(s) financière(s)`}</span>
          <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
        </p>
      </Link>
    </li>
  )
}

export default ActivityCard
