import { XmarkIcon } from '../../icons'
import { useRef } from 'react'
import useModalBehavior from '../../hooks/useModalBehavior'
import IconButton from '../common/IconButton'
import RecordContributionForm from './RecordContributionForm'

/** Fenêtre d'enregistrement d'une cotisation (à monter uniquement quand elle est ouverte). Props : voir RecordContributionForm + onClose. */
function RecordContributionModal({ onClose, ...formProps }) {
  const dialogRef = useRef(null)
  useModalBehavior({ dialogRef, onClose })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-contribution-title"
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="record-contribution-title" className="text-xl font-extrabold text-ink">Enregistrer une cotisation</h2>
            <p className="mt-1 text-sm text-ink-soft">Renseignez un versement réellement reçu. Il sera visible dans l'historique après confirmation du serveur.</p>
          </div>
          <IconButton icon={XmarkIcon} label="Fermer la fenêtre" onClick={onClose} />
        </div>
        <RecordContributionForm {...formProps} onCancel={onClose} />
      </div>
    </div>
  )
}

export default RecordContributionModal
