import { XmarkIcon } from '../../icons'
import { useRef } from 'react'
import useModalBehavior from '../../hooks/useModalBehavior'
import IconButton from '../common/IconButton'
import ContributionForm from './ContributionForm'

/**
 * Fenêtre modale d'ajout ou de modification d'une cotisation.
 * À monter uniquement quand elle est ouverte : le formulaire repart ainsi toujours des bonnes valeurs.
 */
function ContributionFormModal({ title, description, submitLabel, initialValues, todayIso, onSubmit, onClose }) {
  const dialogRef = useRef(null)
  useModalBehavior({ dialogRef, onClose })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contribution-modal-title"
        aria-describedby="contribution-modal-description"
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="contribution-modal-title" className="text-xl font-extrabold text-ink">
              {title}
            </h2>
            <p id="contribution-modal-description" className="mt-1 text-sm text-ink-soft">
              {description}
            </p>
          </div>
          <IconButton icon={XmarkIcon} label="Fermer la fenêtre" onClick={onClose} />
        </div>

        <ContributionForm
          idPrefix="contribution-form"
          initialValues={initialValues}
          todayIso={todayIso}
          submitLabel={submitLabel}
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      </div>
    </div>
  )
}

export default ContributionFormModal
