import ActionButton from '../common/ActionButton'
import FormModal from '../common/FormModal'
import HistoryEntryDetails from './HistoryEntryDetails'

/**
 * Fenêtre modale « Détail du mouvement » (lecture seule). À monter uniquement quand elle est ouverte.
 *
 * Props :
 * - entry : le mouvement à détailler (voir HistoryEntryDetails)
 * - onClose : fonction appelée pour fermer la fenêtre (Fermer, croix, Échap, clic sur le fond)
 */
function HistoryEntryDetailsModal({ entry, onClose }) {
  return (
    <FormModal
      idPrefix="history-modal"
      title="Détail du mouvement"
      description="Informations complètes sur ce mouvement financier."
      onClose={onClose}
      formElement={
        <div className="space-y-6">
          <HistoryEntryDetails entry={entry} />
          <div className="flex justify-end">
            <ActionButton label="Fermer" variant="secondary" onClick={onClose} />
          </div>
        </div>
      }
    />
  )
}

export default HistoryEntryDetailsModal
