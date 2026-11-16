import { BoxArchiveIcon, CircleCheckIcon, CirclePauseIcon, CirclePlayIcon, LayerGroupIcon } from '../../icons'
import SummaryCard from '../dashboard/SummaryCard'

const ICONS = { total: LayerGroupIcon, ACTIVE: CirclePlayIcon, SUSPENDED: CirclePauseIcon, COMPLETED: CircleCheckIcon, ARCHIVED: BoxArchiveIcon }

function ActivityCountCards({ cards }) {
  return (
    <section aria-label="Indicateurs des activités" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <SummaryCard key={card.id} title={card.title} valueLabel={card.valueLabel} footnote={card.footnote} tone={card.tone} icon={ICONS[card.id] ?? LayerGroupIcon} />
      ))}
    </section>
  )
}

export default ActivityCountCards
