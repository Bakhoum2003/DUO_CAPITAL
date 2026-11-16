import { ArrowRightIcon } from '../../icons'
import { Link } from 'react-router-dom'

function AuthSwitchLink({ promptText, linkLabel, to }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
      <p className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-ink">
        <span>{promptText}</span>
        <Link
          to={to}
          className="inline-flex items-center gap-1 font-semibold text-brand-600 transition hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30"
        >
          {linkLabel}
          <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      </p>
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
    </div>
  )
}

export default AuthSwitchLink
