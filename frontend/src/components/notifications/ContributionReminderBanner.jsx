import { BellIcon } from '../../icons'
import { Link } from 'react-router-dom'
import usePreferences from '../../hooks/usePreferences'
import useReminders from '../../hooks/useReminders'
import { ROUTES } from '../../routes/routePaths'
import { formatCurrency } from '../../utils/formatters'
import { shouldShowReminderBadge } from '../../utils/settingsViewModel'

const MAX_LINES = 4

function ContributionReminderBanner() {
  const { preferences } = usePreferences()
  const { view } = useReminders()
  if (!shouldShowReminderBadge(preferences, view)) return null

  const lines = view.items.slice(0, MAX_LINES)
  const hidden = view.itemCount - lines.length

  return (
    <section aria-label="Cotisations à compléter" className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-ink">
      <p className="flex items-center gap-2 font-bold">
        <BellIcon className="h-4 w-4 shrink-0 text-orange-500" aria-hidden="true" />
        {view.itemCount} cotisation{view.itemCount > 1 ? 's' : ''} à compléter
      </p>
      <ul className="mt-2 space-y-1">
        {lines.map((item) => (
          <li key={item.key}>
            {item.partnerName}, {item.monthLabel} : reste <strong>{formatCurrency(item.remaining)}</strong> sur {formatCurrency(item.target)}
          </li>
        ))}
      </ul>
      {hidden > 0 && <p className="mt-1 text-ink-soft">… et {hidden} autre{hidden > 1 ? 's' : ''}.</p>}
      <Link to={ROUTES.CONTRIBUTIONS} className="mt-2 inline-block font-semibold text-brand-700 underline">
        Aller aux cotisations
      </Link>
    </section>
  )
}

export default ContributionReminderBanner
