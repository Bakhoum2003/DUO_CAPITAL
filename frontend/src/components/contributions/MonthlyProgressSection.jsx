import { CalendarDaysIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { formatCurrency } from '../../utils/formatters'
import ProgressBar from '../common/ProgressBar'
import SectionHeader from '../common/SectionHeader'
import AssociateProgressCard from './AssociateProgressCard'
import MonthNavigator from './MonthNavigator'

function MonthlyProgressSection({
  monthLabel,
  canGoPrevious,
  canGoNext,
  onPreviousMonth,
  onNextMonth,
  progressItems,
  collectiveProgress,
}) {
  return (
    <section className={CARD_CLASSES} aria-label="Suivi mensuel des cotisations">
      <SectionHeader
        icon={CalendarDaysIcon}
        iconClassName="text-brand-600"
        title="Suivi mensuel"
        actionElement={
          <MonthNavigator
            monthLabel={monthLabel}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            onPrevious={onPreviousMonth}
            onNext={onNextMonth}
          />
        }
      />

      <div className="rounded-2xl bg-brand-50 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-sm font-semibold text-ink">Objectif collectif de {monthLabel}</p>
          <p className="text-sm text-ink">
            <span className="font-extrabold">{formatCurrency(collectiveProgress.collected)}</span> sur{' '}
            {formatCurrency(collectiveProgress.target)}
          </p>
        </div>
        <div className="mt-3">
          <ProgressBar
            value={collectiveProgress.percent}
            label={`Progression collective de ${monthLabel}`}
            tone={collectiveProgress.isComplete ? 'green' : 'amber'}
          />
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          {collectiveProgress.isComplete
            ? 'Les cotisations de ce mois sont complètes.'
            : `Il manque ${formatCurrency(collectiveProgress.remaining)} pour atteindre l'objectif collectif.`}
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {progressItems.map((item) => (
          <AssociateProgressCard
            key={item.associate.id}
            name={item.associate.name}
            initials={item.associate.initials}
            avatarTone={item.associate.avatarTone}
            collected={item.collected}
            target={item.target}
            remaining={item.remaining}
            percent={item.percent}
            isComplete={item.isComplete}
          />
        ))}
      </div>
    </section>
  )
}

export default MonthlyProgressSection
