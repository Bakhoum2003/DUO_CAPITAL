import { ArrowTrendUpIcon, HashtagIcon, UserIcon } from '../../icons'
import SummaryCard from '../dashboard/SummaryCard'

const ICONS = { count: HashtagIcon, total: ArrowTrendUpIcon }

function WithdrawalStatCards({ cards }) {
  return (
    <section aria-label="Indicateurs des retraits" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <SummaryCard key={card.id} title={card.title} valueLabel={card.valueLabel} footnote={card.footnote} tone={card.tone} icon={ICONS[card.id] ?? UserIcon} />
      ))}
    </section>
  )
}

export default WithdrawalStatCards
