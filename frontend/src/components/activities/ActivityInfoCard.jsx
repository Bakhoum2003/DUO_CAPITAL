import { ClockRotateLeftIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { formatDateTime } from '../../utils/activitiesViewModel'
import { formatShortDate } from '../../utils/formatters'
import SectionHeader from '../common/SectionHeader'

function Row({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
      <dt className="text-sm font-semibold text-ink-soft sm:w-48 sm:shrink-0">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-ink">{value}</dd>
    </div>
  )
}

/** Informations générales et historique de l'activité (uniquement ce que l'API fournit). Props : activity. */
function ActivityInfoCard({ activity }) {
  const person = (value) => value?.name ?? '—'
  return (
    <section className={CARD_CLASSES} aria-label="Informations de l'activité">
      <SectionHeader icon={ClockRotateLeftIcon} title="Informations et historique" />
      <dl className="divide-y divide-line">
        <Row label="Description" value={<>{activity.description || 'Aucune description.'}</>} />
        <Row label="Catégorie" value={<>{activity.category || 'Sans catégorie'}</>} />
        <Row label="Date de démarrage" value={<>{formatShortDate(activity.startDate)}</>} />
        <Row label="Date de fin" value={<>{activity.endDate ? formatShortDate(activity.endDate) : '—'}</>} />
        <Row label="Créée le" value={<>{formatDateTime(activity.createdAt)} par {person(activity.createdBy)}</>} />
        <Row label="Dernière modification" value={<>{formatDateTime(activity.updatedAt)}</>} />
        {activity.completedAt && <Row label="Terminée le" value={<>{formatDateTime(activity.completedAt)} par {person(activity.completedBy)}</>} />}
        {activity.archivedAt && <Row label="Archivée le" value={<>{formatDateTime(activity.archivedAt)} par {person(activity.archivedBy)}</>} />}
      </dl>

      {activity.reopenHistory.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-ink">Réouvertures</h3>
          <ul className="mt-2 space-y-2">
            {activity.reopenHistory.map((entry) => (
              <li key={`${entry.reopenedAt}-${entry.reason}`} className="rounded-xl border border-line bg-surface p-3 text-sm text-ink">
                <p className="font-semibold">{formatDateTime(entry.reopenedAt)} · {person(entry.reopenedBy)}</p>
                <p className="mt-0.5 text-ink-soft">Motif : {entry.reason}</p>
                {entry.previousEndDate && <p className="text-ink-soft">Ancienne date de fin : {formatShortDate(entry.previousEndDate)}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export default ActivityInfoCard
