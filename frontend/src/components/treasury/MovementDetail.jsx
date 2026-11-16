import useMovementDetail from '../../hooks/useMovementDetail'
import { buildDetailRows, isHttpUrl } from '../../utils/treasuryViewModel'
import { formatDateTime } from '../../utils/activitiesViewModel'
import ActionButton from '../common/ActionButton'
import FormError from '../common/FormError'
import MovementTypeBadge from './MovementTypeBadge'

function MovementDetail({ type, id, onClose }) {
  const { status, movement, errorMessage, retry } = useMovementDetail(type, id)

  if (!movement) {
    return status === 'error' ? (
      <div className="space-y-3">
        <FormError variant="banner" message={errorMessage} />
        <div className="flex gap-3"><ActionButton label="Réessayer" onClick={retry} /><ActionButton label="Fermer" variant="secondary" onClick={onClose} /></div>
      </div>
    ) : (
      <p role="status" className="py-8 text-center text-ink-soft">Chargement du détail…</p>
    )
  }

  const rows = buildDetailRows(movement)
  const receiptUrl = movement.details?.receipt?.url
  return (
    <div className="space-y-4">
      <MovementTypeBadge type={movement.type} />
      <dl className="divide-y divide-line">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
            <dt className="text-sm font-semibold text-ink-soft sm:w-48 sm:shrink-0">{row.label}</dt>
            <dd className="min-w-0 break-words text-sm text-ink">{row.value}</dd>
          </div>
        ))}
        {isHttpUrl(receiptUrl) && (
          <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
            <dt className="text-sm font-semibold text-ink-soft sm:w-48 sm:shrink-0">Lien du justificatif</dt>
            <dd className="min-w-0 break-all text-sm"><a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 hover:underline">{receiptUrl}</a></dd>
          </div>
        )}
        <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
          <dt className="text-sm font-semibold text-ink-soft sm:w-48 sm:shrink-0">Enregistré le</dt>
          <dd className="text-sm text-ink">{formatDateTime(movement.recordedAt)}</dd>
        </div>
        <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
          <dt className="text-sm font-semibold text-ink-soft sm:w-48 sm:shrink-0">Enregistrement d’origine</dt>
          <dd className="min-w-0 break-all text-xs text-ink-soft">{movement.origin.collection} · {movement.origin.id}</dd>
        </div>
      </dl>
      <div className="flex justify-end"><ActionButton label="Fermer" variant="secondary" onClick={onClose} /></div>
    </div>
  )
}

export default MovementDetail
