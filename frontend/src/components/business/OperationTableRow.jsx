import { PenIcon, TrashIcon } from '../../icons'
import { OPERATION_TYPES } from '../../constants/businessSettings'
import { formatShortDate } from '../../utils/formatters'
import Avatar from '../common/Avatar'
import IconButton from '../common/IconButton'
import StatusBadge from '../common/StatusBadge'
import OperationAmount from './OperationAmount'

function OperationTableRow({
  type,
  amount,
  date,
  associateName,
  initials,
  avatarTone,
  categoryLabel,
  description,
  onEdit,
  onDelete,
}) {
  const typeStyle = OPERATION_TYPES[type]
  const summary = `${typeStyle.label.toLowerCase()} du ${formatShortDate(date)}`

  return (
    <tr className="border-t border-line transition hover:bg-surface/70">
      <td className="whitespace-nowrap px-4 py-3 text-ink">{formatShortDate(date)}</td>
      <td className="px-4 py-3">
        <StatusBadge label={typeStyle.label} tone={typeStyle.tone} />
      </td>
      <td className="px-4 py-3">
        <OperationAmount type={type} amount={amount} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar initials={initials} tone={avatarTone} size="sm" />
          <span className="font-semibold text-ink">{associateName}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-ink-soft">
        {categoryLabel && <span className="mr-2 font-semibold text-ink">{categoryLabel}</span>}
        {description || (categoryLabel ? '' : '—')}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <IconButton icon={PenIcon} label={`Modifier la ${summary}`} onClick={onEdit} />
          <IconButton icon={TrashIcon} label={`Supprimer la ${summary}`} onClick={onDelete} tone="danger" />
        </div>
      </td>
    </tr>
  )
}

export default OperationTableRow
