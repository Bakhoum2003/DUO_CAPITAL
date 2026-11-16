import { CalendarDaysIcon, CircleCheckIcon, CircleExclamationIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import SectionHeader from '../common/SectionHeader'
import ContributionListItem from './ContributionListItem'

function RecentContributions({ monthLabel, contributions }) {
  const unpaidCount = contributions.filter((contribution) => contribution.status !== 'paid').length
  const isComplete = contributions.length > 0 && unpaidCount === 0

  return (
    <section className={CARD_CLASSES} aria-label="Cotisations du mois">
      <SectionHeader
        icon={CalendarDaysIcon}
        iconClassName="text-brand-600"
        title="Cotisations du mois"
        badgeLabel={monthLabel}
      />

      <ul className="divide-y divide-line">
        {contributions.map((contribution) => (
          <ContributionListItem
            key={contribution.id}
            associateName={contribution.associateName}
            initials={contribution.initials}
            avatarTone={contribution.avatarTone}
            monthLabel={contribution.monthLabel}
            amount={contribution.amount}
            paidOn={contribution.paidOn}
            status={contribution.status}
          />
        ))}
      </ul>

      {contributions.length > 0 && (
        <p
          className={`mt-3 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-center text-sm font-semibold ${
            isComplete ? 'bg-brand-50 text-brand-800' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {isComplete ? (
            <CircleCheckIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <CircleExclamationIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          {isComplete
            ? 'Les cotisations de ce mois sont complètes !'
            : `${unpaidCount} cotisation${unpaidCount > 1 ? 's' : ''} en attente ce mois-ci.`}
        </p>
      )}
    </section>
  )
}

export default RecentContributions
