import { BoxArchiveIcon, CircleCheckIcon, PauseIcon, PenIcon, PlayIcon, RotateLeftIcon } from '../../icons'
import { ACTION_META, canEdit, statusActionsOf } from '../../utils/activitiesViewModel'
import ActionButton from '../common/ActionButton'

const ICONS = { suspend: PauseIcon, reactivate: PlayIcon, complete: CircleCheckIcon, reopen: RotateLeftIcon, archive: BoxArchiveIcon }

/**
 * Boutons d'action d'une activité : uniquement ceux autorisés par le backend pour le statut actuel (`allowedActions`).
 * Aucune suppression. Props : activity, onEdit, onAction(action), disabled.
 */
function ActivityActions({ activity, onEdit, onAction, disabled = false }) {
  const actions = statusActionsOf(activity)
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Actions sur l'activité">
      {canEdit(activity) && <ActionButton label="Modifier" icon={PenIcon} variant="secondary" size="sm" disabled={disabled} onClick={onEdit} />}
      {actions.map((action) => (
        <ActionButton key={action} label={ACTION_META[action].label} icon={ICONS[action]} variant={action === 'archive' ? 'danger' : 'secondary'} size="sm" disabled={disabled} onClick={() => onAction(action)} />
      ))}
      {!canEdit(activity) && actions.length === 0 && <p className="text-sm text-ink-soft">Activité archivée : consultation seule.</p>}
    </div>
  )
}

export default ActivityActions
