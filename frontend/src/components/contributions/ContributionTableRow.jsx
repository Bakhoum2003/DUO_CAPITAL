import { PenIcon, TrashIcon } from '../../icons'
import { formatCurrency, formatShortDate } from '../../utils/formatters'
import Avatar from '../common/Avatar'
import IconButton from '../common/IconButton'

function ContributionTableRow({ associateName, initials, avatarTone, amount, date, description, onEdit, onDelete }) {
  return (
    <tr className="border-t border-line transition hover:bg-surface/70">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar initials={initials} tone={avatarTone} size="sm" />
          <span className="font-semibold text-ink">{associateName}</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-bold text-ink">{formatCurrency(amount)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-ink">{formatShortDate(date)}</td>
      <td className="px-4 py-3 text-ink-soft">{description || '—'}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <IconButton icon={PenIcon} label={`Modifier la cotisation de ${associateName} du ${formatShortDate(date)}`} onClick={onEdit} />
          <IconButton
            icon={TrashIcon}
            label={`Supprimer la cotisation de ${associateName} du ${formatShortDate(date)}`}
            onClick={onDelete}
            tone="danger"
          />
        </div>
      </td>
    </tr>
  )
}

export default ContributionTableRow
