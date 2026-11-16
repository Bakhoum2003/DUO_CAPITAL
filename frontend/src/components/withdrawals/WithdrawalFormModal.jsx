import FormModal from '../common/FormModal'
import WithdrawalForm from './WithdrawalForm'

/** Fenêtre de création / modification d'un retrait (à monter uniquement quand elle est ouverte). */
function WithdrawalFormModal({ isEdit, onClose, ...formProps }) {
  return (
    <FormModal
      idPrefix="withdrawal-form"
      title={isEdit ? 'Modifier le retrait' : 'Enregistrer un retrait'}
      description={isEdit ? "La modification est contrôlée et tracée. L'auteur de l'enregistrement ne change pas." : "Renseignez un retrait réellement effectué. Il sera visible après confirmation du serveur."}
      onClose={onClose}
      formElement={<WithdrawalForm {...formProps} isEdit={isEdit} onCancel={onClose} />}
    />
  )
}

export default WithdrawalFormModal
