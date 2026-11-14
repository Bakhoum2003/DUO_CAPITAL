import { EyeIcon } from '../../icons'
import { DIRECTIONS, HISTORY_TYPES } from '../../constants/historySettings'
import { formatShortDate } from '../../utils/formatters'
import ActionButton from '../common/ActionButton'
import StatusBadge from '../common/StatusBadge'
import HistoryAmount from './HistoryAmount'
import HistoryEntryIcon from './HistoryEntryIcon'

/**
 * Un mouvement sous forme de carte (petits écrans, à la place du tableau).
 *
 * Props :
 * - type, direction, amount, date, description : voir HistoryTableRow
 * - businessName : activité concernée (vide = aucune)
 * - associateName : associé concerné (vide = aucun)
 * - onShowDetails : fonction appelée au clic sur « Voir le détail »
 */
function HistoryMobileItem({ type, direction, amount, date, description, businessName, associateName, onShowDetails }) {
  const directionStyle = DIRECTIONS[direction]

  return (
    <li className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <HistoryEntryIcon type={type} direction={direction} />
        <div className="min-w-[8rem] flex-1">
          <p className="font-bold text-ink">{HISTORY_TYPES[type].label}</p>
          <p className="text-sm text-ink-soft">{formatShortDate(date)}</p>
        </div>
        <HistoryAmount direction={direction} amount={amount} />
      </div>

      <p className="mt-3 text-sm text-ink">{description}</p>
      {(businessName || associateName) && (
        <p className="mt-1 text-xs text-ink-soft">{[businessName, associateName].filter(Boolean).join(' · ')}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <StatusBadge label={directionStyle.label} tone={directionStyle.badgeTone} />
        <ActionButton label="Voir le détail" icon={EyeIcon} variant="secondary" size="sm" onClick={onShowDetails} />
      </div>
    </li>
  )
}

export default HistoryMobileItem
