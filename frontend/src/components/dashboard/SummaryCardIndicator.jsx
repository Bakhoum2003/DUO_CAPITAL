import { CheckIcon } from '../../icons'
import { TONE_STYLES } from '../../constants/toneStyles'

function SummaryCardIndicator({ kind, tone }) {
  const color = TONE_STYLES[tone].stroke

  if (kind === 'check') {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white">
        <CheckIcon className="h-5 w-5" aria-hidden="true" />
      </span>
    )
  }

  if (kind === 'bars') {
    return (
      <svg viewBox="0 0 40 36" className="h-9 w-10" aria-hidden="true" focusable="false">
        <rect x="2" y="22" width="9" height="12" rx="1.5" fill={color} />
        <rect x="15" y="12" width="9" height="22" rx="1.5" fill={color} />
        <rect x="28" y="2" width="9" height="32" rx="1.5" fill={color} />
      </svg>
    )
  }

  if (kind === 'trend') {
    return (
      <svg viewBox="0 0 80 36" className="h-9 w-20" aria-hidden="true" focusable="false">
        <polyline
          points="2,32 16,24 28,27 44,14 58,18 78,4"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return null
}

export default SummaryCardIndicator
