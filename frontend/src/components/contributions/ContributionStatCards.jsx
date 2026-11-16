import { BullseyeIcon, CoinsIcon, MoneyBillWaveIcon, PercentIcon, UsersIcon, WalletIcon } from '../../icons'
import SummaryCard from '../dashboard/SummaryCard'

const ICONS = { total: WalletIcon, p1: UsersIcon, p2: UsersIcon, objective: BullseyeIcon, remaining: CoinsIcon, rate: PercentIcon }

function ContributionStatCards({ cards }) {
  return (
    <section aria-label="Statistiques des cotisations" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <SummaryCard key={card.id} title={card.title} valueLabel={card.valueLabel} footnote={card.footnote} tone={card.tone} icon={ICONS[card.id] ?? MoneyBillWaveIcon} />
      ))}
    </section>
  )
}

export default ContributionStatCards
