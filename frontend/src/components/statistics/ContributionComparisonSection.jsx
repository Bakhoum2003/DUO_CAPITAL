import { UsersIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { formatCurrency } from '../../utils/formatters'
import AssociateProgressCard from '../contributions/AssociateProgressCard'
import EmptyState from '../common/EmptyState'
import AssociateContributionChart from './AssociateContributionChart'

function ContributionComparisonSection({ stats, monthlyData, monthlyTarget, isEmpty }) {
  return (
    <section className={CARD_CLASSES} aria-label="Cotisations des associés">
      <h2 className="text-lg font-bold text-ink">Cotisations des associés</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Versements de chaque associé sur la période, comparés à l'objectif de {formatCurrency(monthlyTarget)} par mois.
      </p>

      {isEmpty ? (
        <EmptyState icon={UsersIcon} title="Aucune donnée" description="Aucune cotisation sur cette période." />
      ) : (
        <div className="mt-4 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {stats.map((item) => (
              <AssociateProgressCard
                key={item.associate.id}
                name={item.associate.name}
                initials={item.associate.initials}
                avatarTone={item.associate.avatarTone}
                collected={item.total}
                target={item.target}
                remaining={item.remaining}
                percent={item.percent}
                isComplete={item.isComplete}
              />
            ))}
          </div>
          <AssociateContributionChart
            data={monthlyData}
            associates={stats.map((item) => item.associate)}
            monthlyTarget={monthlyTarget}
          />
        </div>
      )}
    </section>
  )
}

export default ContributionComparisonSection
