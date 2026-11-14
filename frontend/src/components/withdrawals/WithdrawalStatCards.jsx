import { HashtagIcon, MoneyBillTransferIcon, UserIcon } from '../../icons'
import SummaryCard from '../dashboard/SummaryCard'

const ICONS = { count: HashtagIcon, total: MoneyBillTransferIcon }

/** Indicateurs (valeurs de l'API). Props : cards [{ id, title, valueLabel, footnote, tone }]. */
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
