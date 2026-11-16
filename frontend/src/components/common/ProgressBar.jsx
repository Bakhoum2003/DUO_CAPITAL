const TONE_CLASSES = {
  green: 'bg-brand-600',
  amber: 'bg-amber-500',
}

function ProgressBar({ value, label, tone = 'green' }) {
  const safeValue = Math.min(100, Math.max(0, value))

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
      className="h-2.5 w-full overflow-hidden rounded-full bg-line/70"
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${TONE_CLASSES[tone]}`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  )
}

export default ProgressBar
