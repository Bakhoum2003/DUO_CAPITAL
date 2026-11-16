import { useRef } from 'react'
import { ArrowsRotateIcon } from '../../icons'
import useModalBehavior from '../../hooks/useModalBehavior'
import ActionButton from '../common/ActionButton'

function UnsavedUpdateDialog({ isSubmitting = false, onStay, onDiscard }) {
  const dialogRef = useRef(null)
  const handleStay = () => {
    if (!isSubmitting) onStay()
  }
  useModalBehavior({ dialogRef, onClose: handleStay })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={handleStay} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-update-title"
        aria-describedby="unsaved-update-description"
        className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-600">
          <ArrowsRotateIcon className="h-6 w-6" aria-hidden="true" />
        </div>

        <h2 id="unsaved-update-title" className="mt-4 text-xl font-extrabold text-ink">
          Modifications non enregistrées
        </h2>
        <p id="unsaved-update-description" className="mt-2 text-sm text-ink-soft">
          Un formulaire contient des modifications qui ne sont pas enregistrées. Mettre à jour maintenant recharge la page et les fait perdre.
          Vous pouvez rester sur la page, terminer et enregistrer votre saisie, puis actualiser.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <ActionButton label="Quitter sans enregistrer" variant="danger" onClick={onDiscard} disabled={isSubmitting} />
          <ActionButton label="Rester sur la page" variant="secondary" onClick={handleStay} disabled={isSubmitting} />
        </div>
      </div>
    </div>
  )
}

export default UnsavedUpdateDialog
