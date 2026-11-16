import { PenIcon, TrashIcon } from '../../icons'
import { OPERATION_TYPES } from '../../constants/businessSettings'
import { formatShortDate } from '../../utils/formatters'
import ActionButton from '../common/ActionButton'
import Avatar from '../common/Avatar'
import StatusBadge from '../common/StatusBadge'
import OperationAmount from './OperationAmount'

function OperationMobileItem({
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

  return (
    <li className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <StatusBadge label={typeStyle.label} tone={typeStyle.tone} />
        <OperationAmount type={type} amount={amount} />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Avatar initials={initials} tone={avatarTone} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{associateName}</p>
          <p className="text-sm text-ink-soft">{formatShortDate(date)}</p>
        </div>
      </div>

      {(categoryLabel || description) && (
        <p className="mt-3 text-sm text-ink-soft">
          {categoryLabel && <span className="mr-2 font-semibold text-ink">{categoryLabel}</span>}
          {description}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <ActionButton label="Modifier" icon={PenIcon} variant="secondary" size="sm" onClick={onEdit} />
        <ActionButton label="Supprimer" icon={TrashIcon} variant="secondary" size="sm" onClick={onDelete} />
      </div>
    </li>
  )
}

export default OperationMobileItem
