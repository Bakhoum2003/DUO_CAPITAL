import { BriefcaseIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { ROUTES } from '../../routes/routePaths'
import SectionHeader from '../common/SectionHeader'
import BusinessListItem from './BusinessListItem'

/**
 * Carte « Derniers Business » avec un lien vers la page Business.
 *
 * Props :
 * - businesses : tableau { id, name, category, date, investedAmount, profit, status }
 */
function RecentBusinesses({ businesses }) {
  return (
    <section className={CARD_CLASSES} aria-label="Derniers business">
      <SectionHeader
        icon={BriefcaseIcon}
        iconClassName="text-danger-500"
        title="Derniers Business"
        actionLabel="Voir tout"
        actionTo={ROUTES.BUSINESS}
      />

      {businesses.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-soft">Aucun business pour le moment.</p>
      ) : (
        <ul className="divide-y divide-line">
          {businesses.map((business) => (
            <BusinessListItem
              key={business.id}
              name={business.name}
              category={business.category}
              date={business.date}
              investedAmount={business.investedAmount}
              profit={business.profit}
              status={business.status}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export default RecentBusinesses
