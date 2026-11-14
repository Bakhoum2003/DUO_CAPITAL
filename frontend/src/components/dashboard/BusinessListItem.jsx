import { BottleWaterIcon, CookieBiteIcon, ShirtIcon } from '../../icons'
import { BUSINESS_STATUSES } from '../../constants/statusStyles'
import { TONE_STYLES } from '../../constants/toneStyles'
import { formatCurrency, formatShortDate } from '../../utils/formatters'
import StatusBadge from '../common/StatusBadge'

// Icône et teinte associées à la catégorie d'un business (remplace les photos des maquettes).
const CATEGORY_STYLES = {
  drinks: { icon: BottleWaterIcon, tone: 'orange' },
  tshirts: { icon: ShirtIcon, tone: 'red' },
  snacks: { icon: CookieBiteIcon, tone: 'orange' },
}

/**
 * Une ligne de la liste « Derniers Business ».
 * Sur mobile, les montants passent sous le nom pour rester lisibles.
 *
 * Props :
 * - name : nom du business
 * - category : 'drinks', 'tshirts' ou 'snacks' (choisit l'icône)
 * - date : date au format ISO « AAAA-MM-JJ »
 * - investedAmount : montant investi (FCFA)
 * - profit : bénéfice réalisé (FCFA)
 * - status : 'completed' ou 'ongoing'
 */
function BusinessListItem({ name, category, date, investedAmount, profit, status }) {
  const categoryStyle = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.drinks
  const CategoryIcon = categoryStyle.icon
  const toneStyle = TONE_STYLES[categoryStyle.tone]
  const statusStyle = BUSINESS_STATUSES[status]

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:gap-x-4">
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-xl ${toneStyle.tile} ${toneStyle.icon}`}
      >
        <CategoryIcon className="h-7 w-7" aria-hidden="true" />
      </span>

      <div className="min-w-0">
        <p className="font-bold leading-snug text-ink">{name}</p>
        <p className="text-sm text-ink-soft">{formatShortDate(date)}</p>
      </div>

      <StatusBadge label={statusStyle.label} tone={statusStyle.tone} />

      <dl className="col-span-3 grid grid-cols-2 gap-4 sm:col-span-1 sm:flex sm:gap-8">
        <div className="sm:text-right">
          <dt className="text-sm text-ink-soft">Investi</dt>
          <dd className="font-bold text-ink">{formatCurrency(investedAmount)}</dd>
        </div>
        <div className="text-right">
          <dt className="text-sm text-ink-soft">Bénéfice</dt>
          <dd className="font-bold text-brand-600">{formatCurrency(profit)}</dd>
        </div>
      </dl>
    </li>
  )
}

export default BusinessListItem
