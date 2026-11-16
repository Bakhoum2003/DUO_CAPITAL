import FormModal from '../common/FormModal'
import BusinessForm from './BusinessForm'

/**
 * Fenêtre modale d'ajout ou de modification d'un business.
 * À monter uniquement quand elle est ouverte : le formulaire repart ainsi toujours des bonnes valeurs.
 */
function BusinessFormModal({
  title,
  description,
  submitLabel,
  initialValues,
  todayIso,
  otherBusinessNames,
  earliestOperationDate,
  onSubmit,
  onClose,
}) {
  return (
    <FormModal
      idPrefix="business-modal"
      title={title}
      description={description}
      onClose={onClose}
      formElement={
        <BusinessForm
          idPrefix="business-form"
          initialValues={initialValues}
          todayIso={todayIso}
          otherBusinessNames={otherBusinessNames}
          earliestOperationDate={earliestOperationDate}
          submitLabel={submitLabel}
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      }
    />
  )
}

export default BusinessFormModal
