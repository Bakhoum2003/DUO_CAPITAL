import { ArrowLeftIcon, ArrowsRotateIcon } from '../../icons'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ActionButton from '../../components/common/ActionButton'
import FormError from '../../components/common/FormError'
import ActivityActionDialog from '../../components/activities/ActivityActionDialog'
import ActivityActions from '../../components/activities/ActivityActions'
import ActivityFinancials from '../../components/activities/ActivityFinancials'
import ActivityFormModal from '../../components/activities/ActivityFormModal'
import ActivityInfoCard from '../../components/activities/ActivityInfoCard'
import ActivityStatusBadge from '../../components/activities/ActivityStatusBadge'
import { CARD_CLASSES } from '../../constants/uiClasses'
import useActivityDetail from '../../hooks/useActivityDetail'
import { ROUTES } from '../../routes/routePaths'
import { ACTION_META, buildUpdatePayload, formValuesFromActivity } from '../../utils/activitiesViewModel'
import { todayInDakar } from '../../utils/contributionsViewModel'

const FEEDBACK_MS = 4000
const BackLink = () => (
  <Link to={ROUTES.ACTIVITIES} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline">
    <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
    Retour aux activités
  </Link>
)

/** Contenu de la page détail pour une activité donnée (remonté à chaque changement d'identifiant). */
function ActivityDetails({ activityId }) {
  const detail = useActivityDetail(activityId)
  const { activity, mutation } = detail
  const [isEditing, setIsEditing] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [feedback, setFeedback] = useState('')
  const todayIso = todayInDakar()

  useEffect(() => {
    if (!feedback) return undefined
    const timerId = setTimeout(() => setFeedback(''), FEEDBACK_MS)
    return () => clearTimeout(timerId)
  }, [feedback])

  if (!activity) {
    const notFound = detail.errorStatus === 404 || detail.errorStatus === 400
    return (
      <div className="space-y-4">
        <BackLink />
        {detail.status === 'error' ? (
          <div className="space-y-3">
            <FormError variant="banner" message={notFound ? "Cette activité n'existe pas ou n'existe plus." : detail.errorMessage} />
            {!notFound && <ActionButton label="Réessayer" icon={ArrowsRotateIcon} onClick={detail.refresh} />}
          </div>
        ) : (
          <p role="status" className="py-16 text-center text-ink-soft">Chargement de l'activité…</p>
        )}
      </div>
    )
  }

  const showEndDate = activity.status === 'COMPLETED'
  const openEdit = () => {
    detail.resetMutation()
    setIsEditing(true)
  }
  const openAction = (action) => {
    detail.resetMutation()
    setPendingAction(action)
  }
  const handleUpdate = async (values) => {
    const payload = buildUpdatePayload(values, activity, { showEndDate })
    if (Object.keys(payload).length === 0) {
      setIsEditing(false)
      return
    }
    if (await detail.update(payload)) {
      setIsEditing(false)
      setFeedback('Activité modifiée avec succès.')
    }
  }
  const handleAction = async (input) => {
    if (await detail.transition(pendingAction, input)) {
      setFeedback(ACTION_META[pendingAction].success)
      setPendingAction(null)
    }
  }

  return (
    <div className="space-y-6">
      <BackLink />

      <header className={`${CARD_CLASSES} space-y-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-2xl font-extrabold tracking-tight text-ink">{activity.name}</h2>
            <p className="mt-1 text-sm text-ink-soft">{activity.category || 'Sans catégorie'}</p>
          </div>
          <ActivityStatusBadge status={activity.status} />
        </div>
        <ActivityActions activity={activity} onEdit={openEdit} onAction={openAction} disabled={detail.status === 'refreshing'} />
      </header>

      <FormError variant="banner" tone="info" message={feedback} />
      {detail.status === 'error' && (
        <div className="space-y-2">
          <FormError variant="banner" message={`${detail.errorMessage} Les informations affichées peuvent être périmées.`} />
          <ActionButton label="Réessayer" icon={ArrowsRotateIcon} size="sm" onClick={detail.refresh} />
        </div>
      )}

      <ActivityFinancials financials={activity.financials} operationsCount={activity.operationsCount} />
      <ActivityInfoCard activity={activity} />

      {isEditing && (
        <ActivityFormModal mode="edit" onClose={() => setIsEditing(false)} initialValues={formValuesFromActivity(activity)} showEndDate={showEndDate} todayIso={todayIso} submission={mutation} onSubmit={handleUpdate} />
      )}
      {pendingAction && (
        <ActivityActionDialog action={pendingAction} activity={activity} todayIso={todayIso} submission={mutation} onConfirm={handleAction} onClose={() => setPendingAction(null)} />
      )}
    </div>
  )
}

/** Page « Détail d'une activité » (adresse /activites/:activityId). */
function ActivityDetailsPage() {
  const { activityId } = useParams()
  return <ActivityDetails key={activityId} activityId={activityId} />
}

export default ActivityDetailsPage
