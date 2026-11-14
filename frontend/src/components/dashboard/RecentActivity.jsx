import { ClockRotateLeftIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { ROUTES } from '../../routes/routePaths'
import { ACTIVITY_LABELS, ACTIVITY_STATUS_LABELS, formatActivityAmount } from '../../utils/dashboardViewModel'
import { formatShortDate } from '../../utils/formatters'
import SectionHeader from '../common/SectionHeader'

/** Dernières activités réelles (toutes périodes), de la plus récente à la plus ancienne. */
function RecentActivity({ activities }) {
  return (
    <section className={CARD_CLASSES} aria-label="Activités récentes">
      <SectionHeader icon={ClockRotateLeftIcon} title="Activités récentes" actionLabel="Voir l'historique" actionTo={ROUTES.HISTORY} />
      {activities.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-soft">Aucune activité enregistrée pour le moment.</p>
      ) : (
        <ul className="divide-y divide-line">
          {activities.map((activity) => (
            <li key={`${activity.kind}-${activity.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">
                  {ACTIVITY_LABELS[activity.kind] ?? activity.kind}
                  {activity.description ? ` · ${activity.description}` : ''}
                </p>
                <p className="text-sm text-ink-soft">
                  {formatShortDate(activity.date)}
                  {activity.partner ? ` · ${activity.partner.name}` : ''}
                  {activity.businessName ? ` · ${activity.businessName}` : ''}
                  {` · ${ACTIVITY_STATUS_LABELS[activity.status] ?? activity.status}`}
                </p>
              </div>
              <p className={`shrink-0 font-bold ${activity.direction === 'IN' ? 'text-brand-600' : 'text-danger-500'}`}>{formatActivityAmount(activity)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default RecentActivity
