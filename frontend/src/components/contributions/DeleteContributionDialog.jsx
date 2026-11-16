import { TrashIcon } from '../../icons'
import { useRef } from 'react'
import useModalBehavior from '../../hooks/useModalBehavior'
import { formatCurrency, formatShortDate } from '../../utils/formatters'
import ActionButton from '../common/ActionButton'

function DeleteContributionDialog({ associateName, amount, date, onConfirm, onClose }) {
  const dialogRef = useRef(null)
  useModalBehavior({ dialogRef, onClose })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-contribution-title"
        aria-describedby="delete-contribution-description"
        className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-600">
          <TrashIcon className="h-6 w-6" aria-hidden="true" />
        </div>

        <h2 id="delete-contribution-title" className="mt-4 text-xl font-extrabold text-ink">
          Supprimer cette cotisation ?
        </h2>
        <p id="delete-contribution-description" className="mt-2 text-sm text-ink-soft">
          La cotisation de {associateName} ({formatCurrency(amount)}, {formatShortDate(date)}) sera retirée de
          l'historique et des statistiques.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <ActionButton label="Annuler" variant="secondary" onClick={onClose} />
          <ActionButton label="Supprimer" icon={TrashIcon} variant="danger" onClick={onConfirm} />
        </div>
      </div>
    </div>
  )
}

export default DeleteContributionDialog
