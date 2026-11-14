import { EyeIcon } from '../../icons'
import { DIRECTIONS, HISTORY_TYPES } from '../../constants/historySettings'
import { formatShortDate } from '../../utils/formatters'
import IconButton from '../common/IconButton'
import StatusBadge from '../common/StatusBadge'
import HistoryAmount from './HistoryAmount'
import HistoryEntryIcon from './HistoryEntryIcon'

/**
 * Une ligne du tableau de l'historique (écrans moyens et grands).
 *
 * Props :
 * - type : type de mouvement ('contribution', 'investment', 'expense', 'revenue', 'withdrawal', 'profit')
 * - direction : 'in', 'out' ou 'none'
 * - amount : montant (FCFA)
 * - date : date ISO « AAAA-MM-JJ »
 * - description : description du mouvement
 * - businessName : activité concernée (vide = aucune)
 * - associateName : associé concerné (vide = aucun)
 * - onShowDetails : fonction appelée au clic sur « Voir le détail »
 */
function HistoryTableRow({ type, direction, amount, date, description, businessName, associateName, onShowDetails }) {
  const typeStyle = HISTORY_TYPES[type]
  const directionStyle = DIRECTIONS[direction]

  return (
    <tr className="border-t border-line transition hover:bg-surface/70">
      <td className="whitespace-nowrap px-4 py-3 text-ink">{formatShortDate(date)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <HistoryEntryIcon type={type} direction={direction} />
          <span className="font-semibold text-ink">{typeStyle.label}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-ink">{description}</p>
        {businessName && <p className="text-xs text-ink-soft">{businessName}</p>}
      </td>
      <td className="px-4 py-3 text-ink">{associateName || '—'}</td>
      <td className="px-4 py-3">
        <HistoryAmount direction={direction} amount={amount} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge label={directionStyle.label} tone={directionStyle.badgeTone} />
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <IconButton
            icon={EyeIcon}
            label={`Voir le détail : ${typeStyle.label.toLowerCase()} du ${formatShortDate(date)}`}
            onClick={onShowDetails}
          />
        </div>
      </td>
    </tr>
  )
}

export default HistoryTableRow
