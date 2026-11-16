import { ChartColumnIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import EmptyState from '../common/EmptyState'

function StatisticsChartCard({ title, description, chartElement, isEmpty, emptyMessage }) {
  return (
    <section className={CARD_CLASSES} aria-label={title}>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink-soft">{description}</p>

      <div className="mt-4">
        {isEmpty ? (
          <EmptyState icon={ChartColumnIcon} title="Aucune donnée" description={emptyMessage} />
        ) : (
          chartElement
        )}
      </div>
    </section>
  )
}

export default StatisticsChartCard
