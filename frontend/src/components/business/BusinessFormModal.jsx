import FormModal from '../common/FormModal'
import BusinessForm from './BusinessForm'

/**
 * Fenêtre modale d'ajout ou de modification d'un business.
 * À monter uniquement quand elle est ouverte : le formulaire repart ainsi toujours des bonnes valeurs.
 *
 * Props :
 * - title, description : en-tête de la fenêtre
 * - submitLabel : texte du bouton d'enregistrement
 * - initialValues, todayIso, otherBusinessNames, earliestOperationDate : voir BusinessForm
 * - onSubmit : fonction appelée avec les valeurs validées
 * - onClose : fonction appelée pour fermer la fenêtre
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
