import { BriefcaseIcon, MagnifyingGlassIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { activityDetailsPath } from '../../routes/routePaths'
import ActionButton from '../common/ActionButton'
import EmptyState from '../common/EmptyState'
import ActivityCard from './ActivityCard'

/**
 * Liste paginée des activités (cartes). Distingue « aucune activité » et « aucun résultat pour ces filtres ».
 * Props : activities, meta { page, totalPages, total }, hasActiveFilters, onPageChange, onAdd, onReset, isRefreshing.
 */
function ActivityList({ activities, meta, hasActiveFilters, onPageChange, onAdd, onReset, isRefreshing }) {
  if (activities.length === 0) {
    return (
      <section className={CARD_CLASSES} aria-label="Liste des activités">
        {hasActiveFilters ? (
          <EmptyState icon={MagnifyingGlassIcon} title="Aucun résultat" description="Aucune activité ne correspond à votre recherche ou à ces filtres." actionLabel="Réinitialiser les filtres" onAction={onReset} />
        ) : (
          <EmptyState icon={BriefcaseIcon} title="Aucune activité pour le moment" description="Créez la première activité commerciale du fonds pour commencer le suivi." actionLabel="Nouvelle activité" onAction={onAdd} />
        )}
      </section>
    )
  }

  return (
    <section aria-label="Liste des activités" aria-busy={isRefreshing} className={isRefreshing ? 'opacity-70 transition' : 'transition'}>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} to={activityDetailsPath(activity.id)} />
        ))}
      </ul>

      {meta && meta.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-between gap-3">
          <ActionButton label="Précédent" variant="secondary" size="sm" disabled={meta.page <= 1 || isRefreshing} onClick={() => onPageChange(meta.page - 1)} />
          <p className="text-sm text-ink-soft">
            Page {meta.page} sur {meta.totalPages} · {meta.total} activité(s)
          </p>
          <ActionButton label="Suivant" variant="secondary" size="sm" disabled={meta.page >= meta.totalPages || isRefreshing} onClick={() => onPageChange(meta.page + 1)} />
        </nav>
      )}
    </section>
  )
}

export default ActivityList
