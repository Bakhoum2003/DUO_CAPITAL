import { ArrowTrendDownIcon, ArrowTrendUpIcon, ScaleBalancedIcon, WalletIcon } from '../../icons'
import { RESULT_KIND_LABELS } from '../../constants/businessSettings'
import { getResultKind } from '../../utils/businessCalculations'
import { formatCurrency, formatSignedAmount } from '../../utils/formatters'
import SummaryCard from '../dashboard/SummaryCard'

/** Les quatre chiffres clés d'un business : total investi, dépenses, recettes, résultat financier. */
function BusinessFinancialCards({ initialInvestment, totalInvested, totalExpenses, totalRevenues, result }) {
  const resultKind = getResultKind(result)

  return (
    <section aria-label="Chiffres clés du business" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title="Total investi"
        amount={totalInvested}
        icon={WalletIcon}
        tone="violet"
        footnote={`dont ${formatCurrency(initialInvestment)} au lancement`}
      />
      <SummaryCard title="Total des dépenses" amount={totalExpenses} icon={ArrowTrendDownIcon} tone="red" />
      <SummaryCard title="Total des recettes" amount={totalRevenues} icon={ArrowTrendUpIcon} tone="green" />
      <SummaryCard
        title="Résultat financier"
        valueLabel={`${resultKind === 'break-even' ? '0' : formatSignedAmount(result)} FCFA`}
        icon={ScaleBalancedIcon}
        tone={resultKind === 'loss' ? 'red' : 'green'}
        footnote={RESULT_KIND_LABELS[resultKind]}
      />
    </section>
  )
}

export default BusinessFinancialCards
