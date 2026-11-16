import { TrashIcon } from '../../icons'
import { useRef } from 'react'
import useModalBehavior from '../../hooks/useModalBehavior'
import ActionButton from './ActionButton'

function ConfirmDialog({
  idPrefix,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  icon: Icon = TrashIcon,
  confirmVariant = 'danger',
  isSubmitting = false,
}) {
  const dialogRef = useRef(null)
  const handleClose = () => {
    if (!isSubmitting) onClose()
  }
  useModalBehavior({ dialogRef, onClose: handleClose })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={handleClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${idPrefix}-title`}
        aria-describedby={`${idPrefix}-description`}
        className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
      >
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full ${
            confirmVariant === 'danger' ? 'bg-danger-50 text-danger-600' : 'bg-brand-50 text-brand-600'
          }`}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>

        <h2 id={`${idPrefix}-title`} className="mt-4 text-xl font-extrabold text-ink">
          {title}
        </h2>
        <p id={`${idPrefix}-description`} className="mt-2 text-sm text-ink-soft">
          {description}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <ActionButton label="Annuler" variant="secondary" onClick={handleClose} disabled={isSubmitting} />
          <ActionButton label={confirmLabel} icon={Icon} variant={confirmVariant} onClick={onConfirm} disabled={isSubmitting} />
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
