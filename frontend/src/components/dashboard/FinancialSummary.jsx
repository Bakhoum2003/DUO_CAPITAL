import { ArrowDownIcon, ArrowTrendUpIcon, ChartColumnIcon, RocketIcon, WalletIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { formatNumber } from '../../utils/formatters'
import SectionHeader from '../common/SectionHeader'

const ITEM_STYLES = {
  contributions: { icon: WalletIcon, color: 'text-brand-600' },
  investments: { icon: RocketIcon, color: 'text-violet-600' },
  revenues: { icon: ArrowTrendUpIcon, color: 'text-brand-600' },
  expenses: { icon: ArrowDownIcon, color: 'text-danger-500' },
}

/**
 * Carte « Résumé Financier » : quatre totaux (cotisations, investissements, recettes, dépenses).
 * 4 colonnes sur grand écran, 2 colonnes sur petit écran.
 *
 * Props :
 * - items : tableau { id, label, amount } ; id ∈ 'contributions', 'investments', 'revenues', 'expenses'
 */
function FinancialSummary({ items }) {
  return (
    <section className={CARD_CLASSES} aria-label="Résumé financier">
      <SectionHeader icon={ChartColumnIcon} iconClassName="text-brand-600" title="Résumé Financier" />

      <ul className="grid grid-cols-2 gap-y-6 sm:grid-cols-4 sm:divide-x sm:divide-line">
        {items.map((item) => {
          const style = ITEM_STYLES[item.id]
          const ItemIcon = style.icon

          return (
            <li key={item.id} className="flex flex-col items-center px-2 text-center">
              <ItemIcon className={`h-7 w-7 ${style.color}`} aria-hidden="true" />
              <p className="mt-2 text-xl font-extrabold text-ink">{formatNumber(item.amount)}</p>
              <p className="mt-0.5 text-sm text-ink">{item.label}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default FinancialSummary
