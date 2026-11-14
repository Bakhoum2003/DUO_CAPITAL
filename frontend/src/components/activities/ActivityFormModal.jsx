import FormModal from '../common/FormModal'
import ActivityForm from './ActivityForm'

/**
 * Fenêtre de création ou de modification (à monter uniquement quand elle est ouverte).
 * Props : mode ('create' | 'edit'), onClose + props de ActivityForm.
 */
function ActivityFormModal({ mode, onClose, ...formProps }) {
  const isCreate = mode === 'create'
  return (
    <FormModal
      idPrefix="activity-form"
      title={isCreate ? 'Nouvelle activité' : "Modifier l'activité"}
      description={isCreate ? "Renseignez l'activité commerciale. Elle sera créée « En cours » par le serveur." : "Modifiez les informations de l'activité. Les opérations financières ne sont pas affectées."}
      onClose={onClose}
      formElement={<ActivityForm mode={mode} onCancel={onClose} {...formProps} />}
    />
  )
}

export default ActivityFormModal
