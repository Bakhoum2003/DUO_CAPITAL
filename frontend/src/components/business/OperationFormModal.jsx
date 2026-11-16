import FormModal from '../common/FormModal'
import OperationForm from './OperationForm'

/**
 * Fenêtre modale d'ajout ou de modification d'une opération financière.
 * À monter uniquement quand elle est ouverte.
 */
function OperationFormModal({
  operationType,
  title,
  description,
  submitLabel,
  initialValues,
  todayIso,
  launchDate,
  onSubmit,
  onClose,
}) {
  return (
    <FormModal
      idPrefix="operation-modal"
      title={title}
      description={description}
      onClose={onClose}
      formElement={
        <OperationForm
          idPrefix="operation-form"
          operationType={operationType}
          initialValues={initialValues}
          todayIso={todayIso}
          launchDate={launchDate}
          submitLabel={submitLabel}
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      }
    />
  )
}

export default OperationFormModal
