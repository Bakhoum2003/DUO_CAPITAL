import { ClockIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { formatShortDate } from '../../utils/formatters'
import { formatMoney } from '../../utils/treasuryViewModel'
import SectionHeader from '../common/SectionHeader'

/** Derniers retraits (fournis par l'API). Props : withdrawals, onSelect(withdrawal). */
function LatestWithdrawals({ withdrawals, onSelect }) {
  if (withdrawals.length === 0) return null
  return (
    <section className={CARD_CLASSES} aria-label="Derniers retraits">
      <SectionHeader icon={ClockIcon} title="Derniers retraits" />
      <ul className="divide-y divide-line text-sm">
        {withdrawals.map((withdrawal) => (
          <li key={withdrawal.id}>
            <button type="button" onClick={() => onSelect(withdrawal)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30">
              <span className="min-w-0">
                <span className="block font-medium text-ink">{withdrawal.beneficiary.name} <span className="font-normal text-ink-soft">· {formatShortDate(withdrawal.withdrawalDate)}</span></span>
                <span className="block truncate text-xs text-ink-soft">{withdrawal.reason || 'Aucun motif'}</span>
              </span>
              <span className="shrink-0 font-bold text-danger-600">− {formatMoney(withdrawal.amount)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default LatestWithdrawals
