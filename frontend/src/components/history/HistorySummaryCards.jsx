import { ArrowTrendDownIcon, ArrowTrendUpIcon, ReceiptIcon, ScaleBalancedIcon } from '../../icons'
import { formatCurrency, formatNumber, formatSignedAmount } from '../../utils/formatters'
import SummaryCard from '../dashboard/SummaryCard'

/**
 * Les quatre indicateurs de la vue générale : entrées, sorties, solde net, nombre d'opérations.
 * Ils portent sur les mouvements affichés (donc sur la période et les filtres choisis).
 *
 * Props :
 * - totalIn : total des entrées (FCFA)
 * - totalOut : total des sorties (FCFA)
 * - netBalance : solde net = entrées − sorties (FCFA, peut être négatif)
 * - movementCount : nombre de mouvements d'argent
 * - isFiltered : vrai quand des filtres sont actifs (les libellés l'indiquent)
 */
function HistorySummaryCards({ totalIn, totalOut, netBalance, movementCount, isFiltered }) {
  const scope = isFiltered ? 'selon vos filtres' : 'sur toute la période'

  return (
    <section aria-label="Vue générale des mouvements" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard title="Total des entrées" amount={totalIn} icon={ArrowTrendUpIcon} tone="green" footnote="Cotisations et recettes" />
      <SummaryCard title="Total des sorties" amount={totalOut} icon={ArrowTrendDownIcon} tone="red" footnote="Investissements, dépenses, retraits" />
      <SummaryCard
        title="Solde net des mouvements"
        valueLabel={netBalance === 0 ? formatCurrency(0) : `${formatSignedAmount(netBalance)} FCFA`}
        icon={ScaleBalancedIcon}
        tone={netBalance < 0 ? 'red' : 'blue'}
        footnote="Entrées − sorties"
      />
      <SummaryCard
        title="Nombre d'opérations"
        valueLabel={formatNumber(movementCount)}
        icon={ReceiptIcon}
        tone="violet"
        footnote={`Mouvements d'argent, ${scope}`}
      />
    </section>
  )
}

export default HistorySummaryCards
