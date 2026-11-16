import useOperationDetail from '../../hooks/useOperationDetail'
import { formatDateTime } from '../../utils/activitiesViewModel'
import { buildOperationRows } from '../../utils/historyViewModel'
import { isHttpUrl } from '../../utils/treasuryViewModel'
import ActionButton from '../common/ActionButton'
import FormError from '../common/FormError'
import FormModal from '../common/FormModal'
import MovementTypeBadge from '../treasury/MovementTypeBadge'

const Row = ({ label, children }) => (
  <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
    <dt className="text-sm font-semibold text-ink-soft sm:w-48 sm:shrink-0">{label}</dt>
    <dd className="min-w-0 break-words text-sm text-ink">{children}</dd>
  </div>
)

function Detail({ type, id, onClose }) {
  const { status, operation, errorMessage, retry } = useOperationDetail(type, id)
  if (!operation) {
    return status === 'error' ? (
      <div className="space-y-3">
        <FormError variant="banner" message={errorMessage} />
        <div className="flex gap-3"><ActionButton label="Réessayer" onClick={retry} /><ActionButton label="Fermer" variant="secondary" onClick={onClose} /></div>
      </div>
    ) : (
      <p role="status" className="py-8 text-center text-ink-soft">Chargement du détail…</p>
    )
  }
  const receiptUrl = operation.details?.receipt?.url
  return (
    <div className="space-y-4">
      <MovementTypeBadge type={operation.type} />
      <dl className="divide-y divide-line">
        {buildOperationRows(operation).map((row) => <Row key={row.label} label={row.label}>{row.value}</Row>)}
        {isHttpUrl(receiptUrl) && (
          <Row label="Lien du justificatif"><a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-brand-700 hover:underline">{receiptUrl}</a></Row>
        )}
        <Row label="Enregistré le">{formatDateTime(operation.recordedAt)}</Row>
      </dl>
      <div className="flex justify-end"><ActionButton label="Fermer" variant="secondary" onClick={onClose} /></div>
    </div>
  )
}

/** Détail d'une opération lu auprès de l'API (à monter uniquement quand une opération est sélectionnée). */
function OperationDetailModal({ operation, onClose }) {
  return <FormModal idPrefix="operation-detail" title="Détail de l'opération" description="Informations de l'enregistrement d'origine, telles qu'enregistrées." onClose={onClose} formElement={<Detail type={operation.type} id={operation.id} onClose={onClose} />} />
}

export default OperationDetailModal
