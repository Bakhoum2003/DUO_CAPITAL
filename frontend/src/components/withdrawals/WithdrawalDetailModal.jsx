import useWithdrawalDetail from '../../hooks/useWithdrawalDetail'
import { formatDateTime } from '../../utils/activitiesViewModel'
import { buildDetailRows } from '../../utils/withdrawalsViewModel'
import ActionButton from '../common/ActionButton'
import FormError from '../common/FormError'
import FormModal from '../common/FormModal'

function Detail({ id, onClose, onEdit, onDelete, disabled }) {
  const { status, withdrawal, errorMessage, retry } = useWithdrawalDetail(id)
  if (!withdrawal) {
    return status === 'error' ? (
      <div className="space-y-3">
        <FormError variant="banner" message={errorMessage} />
        <div className="flex gap-3"><ActionButton label="Réessayer" onClick={retry} /><ActionButton label="Fermer" variant="secondary" onClick={onClose} /></div>
      </div>
    ) : (
      <p role="status" className="py-8 text-center text-ink-soft">Chargement du détail…</p>
    )
  }
  return (
    <div className="space-y-4">
      <dl className="divide-y divide-line">
        {buildDetailRows(withdrawal).map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
            <dt className="text-sm font-semibold text-ink-soft sm:w-40 sm:shrink-0">{row.label}</dt>
            <dd className="min-w-0 break-words text-sm text-ink">{row.value}</dd>
          </div>
        ))}
        <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
          <dt className="text-sm font-semibold text-ink-soft sm:w-40 sm:shrink-0">Enregistré le</dt>
          <dd className="text-sm text-ink">{formatDateTime(withdrawal.createdAt)}</dd>
        </div>
        {withdrawal.updatedAt && withdrawal.updatedAt !== withdrawal.createdAt && (
          <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
            <dt className="text-sm font-semibold text-ink-soft sm:w-40 sm:shrink-0">Dernière modification</dt>
            <dd className="text-sm text-ink">{formatDateTime(withdrawal.updatedAt)}</dd>
          </div>
        )}
      </dl>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <ActionButton label="Fermer" variant="secondary" onClick={onClose} />
        <ActionButton label="Modifier" variant="secondary" disabled={disabled} onClick={() => onEdit(withdrawal)} />
        <ActionButton label="Supprimer" variant="secondary" disabled={disabled} onClick={() => onDelete(withdrawal)} />
      </div>
    </div>
  )
}

/** Détail d'un retrait lu auprès de l'API (à monter uniquement quand un retrait est sélectionné). Props : withdrawal { id }, onClose, onEdit, onDelete, disabled. */
function WithdrawalDetailModal({ withdrawal, onClose, ...actions }) {
  return <FormModal idPrefix="withdrawal-detail" title="Détail du retrait" description="Informations telles qu'enregistrées." onClose={onClose} formElement={<Detail id={withdrawal.id} onClose={onClose} {...actions} />} />
}

export default WithdrawalDetailModal
