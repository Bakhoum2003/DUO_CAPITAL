import { ArrowsRotateIcon } from '../../icons'
import { useEffect, useMemo, useState } from 'react'
import ActionButton from '../../components/common/ActionButton'
import FormError from '../../components/common/FormError'
import PageHeader from '../../components/common/PageHeader'
import ActivityCountCards from '../../components/activities/ActivityCountCards'
import ActivityFiltersBar from '../../components/activities/ActivityFiltersBar'
import ActivityFormModal from '../../components/activities/ActivityFormModal'
import ActivityList from '../../components/activities/ActivityList'
import useActivitiesModule from '../../hooks/useActivitiesModule'
import { buildCategoryOptions, buildCountCards, buildCreatePayload, emptyFormValues, hasActiveFilters } from '../../utils/activitiesViewModel'
import { todayInDakar } from '../../utils/contributionsViewModel'

const FEEDBACK_MS = 4000
const TITLE = 'Activités commerciales'
const DESCRIPTION = 'Créez et suivez les activités du fonds : statut, dates et résultats. Les opérations financières restent gérées séparément.'

/**
 * Page « Activités commerciales » : indicateurs, recherche, filtres, tri, liste paginée et création.
 * Toutes les données viennent de l'API ; aucune donnée fictive ; chargement, erreur, liste vide et aucun résultat sont distincts.
 */
function ActivitiesPage() {
  const activities = useActivitiesModule()
  const { filters, list, mutation } = activities
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const todayIso = todayInDakar()

  useEffect(() => {
    if (!feedback) return undefined
    const timerId = setTimeout(() => setFeedback(''), FEEDBACK_MS)
    return () => clearTimeout(timerId)
  }, [feedback])

  const meta = list.data?.meta ?? null
  const categoryOptions = useMemo(() => buildCategoryOptions(meta?.categories, filters.category), [meta?.categories, filters.category])
  const cards = useMemo(() => buildCountCards(meta?.counts), [meta?.counts])
  const filtersActive = hasActiveFilters(filters)

  const openModal = () => {
    activities.resetMutation()
    setIsModalOpen(true)
  }
  const handleCreate = async (values) => {
    if (await activities.create(buildCreatePayload(values))) {
      setIsModalOpen(false)
      setFeedback('Activité créée avec succès.')
    }
  }

  const header = <PageHeader title={TITLE} description={DESCRIPTION} addButtonLabel="Nouvelle activité" onAddClick={openModal} />
  const modal = isModalOpen && (
    <ActivityFormModal mode="create" onClose={() => setIsModalOpen(false)} initialValues={emptyFormValues(todayIso)} todayIso={todayIso} submission={mutation} onSubmit={handleCreate} />
  )

  // Première lecture : pas encore de données.
  if (!list.data) {
    return (
      <div className="space-y-6">
        {header}
        {list.status === 'error' ? (
          <div className="space-y-3">
            <FormError variant="banner" message={list.errorMessage} />
            <ActionButton label="Réessayer" icon={ArrowsRotateIcon} onClick={activities.refresh} />
          </div>
        ) : (
          <p role="status" className="py-16 text-center text-ink-soft">Chargement des activités…</p>
        )}
        {modal}
      </div>
    )
  }

  const isRefreshing = list.status === 'refreshing' || list.status === 'loading'

  return (
    <div className="space-y-6">
      {header}

      <FormError variant="banner" tone="info" message={feedback} />
      {list.status === 'error' && (
        <div className="space-y-2">
          <FormError variant="banner" message={`${list.errorMessage} Les informations affichées peuvent être périmées.`} />
          <ActionButton label="Réessayer" icon={ArrowsRotateIcon} size="sm" onClick={activities.refresh} />
        </div>
      )}

      <ActivityCountCards cards={cards} />

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <ActivityFiltersBar filters={filters} searchText={activities.searchText} onSearchChange={activities.setSearchText} onFilterChange={activities.setFilter} onReset={activities.resetFilters} hasActiveFilters={filtersActive} categoryOptions={categoryOptions} />
          </div>
          <ActionButton label="Actualiser" icon={ArrowsRotateIcon} variant="secondary" size="sm" disabled={isRefreshing} onClick={activities.refresh} />
        </div>

        <ActivityList activities={list.data.data.activities} meta={meta} hasActiveFilters={filtersActive} onPageChange={activities.setPage} onAdd={openModal} onReset={activities.resetFilters} isRefreshing={isRefreshing} />
      </section>

      {modal}
    </div>
  )
}

export default ActivitiesPage
