import { ArrowTrendUpIcon, BriefcaseIcon, ScaleBalancedIcon, WalletIcon } from '../../icons'
import { getResultKind } from '../../utils/businessCalculations'
import { formatNumber, formatSignedAmount } from '../../utils/formatters'
import SummaryCard from '../dashboard/SummaryCard'

function BusinessSummaryCards({ businessCount, totalInvested, totalRevenues, result }) {
  const resultKind = getResultKind(result)
  const resultTitle = resultKind === 'loss' ? 'Pertes cumulées' : 'Bénéfices cumulés'
  const resultFootnote = {
    profit: 'Recettes − dépenses − investissements',
    loss: 'Recettes − dépenses − investissements',
    'break-even': 'Aucun bénéfice ni perte',
  }[resultKind]

  return (
    <section aria-label="Récapitulatif des business" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title="Nombre total de business"
        valueLabel={formatNumber(businessCount)}
        icon={BriefcaseIcon}
        tone="blue"
        footnote={businessCount > 1 ? 'activités commerciales' : 'activité commerciale'}
      />
      <SummaryCard title="Total des investissements" amount={totalInvested} icon={WalletIcon} tone="violet" />
      <SummaryCard title="Total des recettes" amount={totalRevenues} icon={ArrowTrendUpIcon} tone="green" />
      <SummaryCard
        title={resultTitle}
        valueLabel={`${resultKind === 'break-even' ? '0' : formatSignedAmount(result)} FCFA`}
        icon={ScaleBalancedIcon}
        tone={resultKind === 'loss' ? 'red' : 'green'}
        footnote={resultFootnote}
      />
    </section>
  )
}

export default BusinessSummaryCards
