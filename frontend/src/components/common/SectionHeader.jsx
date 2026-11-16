import { ArrowRightIcon } from '../../icons'
import { Link } from 'react-router-dom'

function SectionHeader({
  icon: Icon,
  iconClassName = 'text-brand-600',
  title,
  actionLabel,
  actionTo,
  badgeLabel,
  actionElement = null,
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className={`h-6 w-6 shrink-0 ${iconClassName}`} aria-hidden="true" />
        <h2 className="text-lg font-bold leading-snug text-ink">{title}</h2>
      </div>

      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-600 transition hover:text-brand-700 hover:underline"
        >
          {actionLabel}
          <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}

      {badgeLabel && (
        <span className="shrink-0 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-ink shadow-sm">
          {badgeLabel}
        </span>
      )}

      {actionElement}
    </div>
  )
}

export default SectionHeader
