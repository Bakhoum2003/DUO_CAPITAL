import { PenIcon, TrashIcon } from '../../icons'
import { formatCurrency, formatShortDate } from '../../utils/formatters'
import ActionButton from '../common/ActionButton'
import Avatar from '../common/Avatar'

/**
 * Une cotisation sous forme de carte (petits écrans, à la place du tableau).
 *
 * Props :
 * - associateName, initials, avatarTone : associé concerné
 * - amount : montant (FCFA)
 * - date : date ISO « AAAA-MM-JJ »
 * - description : description (facultative)
 * - onEdit : fonction appelée au clic sur « Modifier »
 * - onDelete : fonction appelée au clic sur « Supprimer »
 */
function ContributionMobileItem({ associateName, initials, avatarTone, amount, date, description, onEdit, onDelete }) {
  return (
    <li className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center gap-3">
        <Avatar initials={initials} tone={avatarTone} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">{associateName}</p>
          <p className="text-sm text-ink-soft">{formatShortDate(date)}</p>
        </div>
        <p className="font-extrabold text-ink">{formatCurrency(amount)}</p>
      </div>

      {description && <p className="mt-3 text-sm text-ink-soft">{description}</p>}

      <div className="mt-3 flex gap-2">
        <ActionButton label="Modifier" icon={PenIcon} variant="secondary" size="sm" onClick={onEdit} />
        <ActionButton label="Supprimer" icon={TrashIcon} variant="secondary" size="sm" onClick={onDelete} />
      </div>
    </li>
  )
}

export default ContributionMobileItem
