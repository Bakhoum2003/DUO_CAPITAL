import FormModal from '../common/FormModal'
import MovementDetail from './MovementDetail'

/** Fenêtre de détail d'un mouvement (à monter uniquement quand un mouvement est sélectionné). Props : movement { type, id }, onClose. */
function MovementDetailModal({ movement, onClose }) {
  return (
    <FormModal
      idPrefix="movement-detail"
      title="Détail du mouvement"
      description="Informations de l'enregistrement d'origine, telles qu'enregistrées."
      onClose={onClose}
      formElement={<MovementDetail type={movement.type} id={movement.id} onClose={onClose} />}
    />
  )
}

export default MovementDetailModal
