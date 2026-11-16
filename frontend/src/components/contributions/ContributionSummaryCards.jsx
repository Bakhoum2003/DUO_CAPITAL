import { BullseyeIcon, UserIcon, WalletIcon } from '../../icons'
import { formatCurrency } from '../../utils/formatters'
import SummaryCard from '../dashboard/SummaryCard'

function describeCount(count) {
  return `${count} cotisation${count > 1 ? 's' : ''}`
}

function ContributionSummaryCards({
  totalAmount,
  contributionCount,
  associateTotals,
  collectiveTarget,
  monthlyTargetPerAssociate,
}) {
  return (
    <section aria-label="Récapitulatif des cotisations" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title="Total des cotisations reçues"
        amount={totalAmount}
        icon={WalletIcon}
        tone="green"
        footnote={describeCount(contributionCount)}
        indicator="trend"
      />

      {associateTotals.map(({ associate, total, count }) => (
        <SummaryCard
          key={associate.id}
          title={`Cotisations de ${associate.name}`}
          amount={total}
          icon={UserIcon}
          tone={associate.avatarTone}
          footnote={describeCount(count)}
        />
      ))}

      <SummaryCard
        title="Objectif mensuel collectif"
        amount={collectiveTarget}
        icon={BullseyeIcon}
        tone="blue"
        footnote={`${associateTotals.length} × ${formatCurrency(monthlyTargetPerAssociate)} par mois`}
      />
    </section>
  )
}

export default ContributionSummaryCards
