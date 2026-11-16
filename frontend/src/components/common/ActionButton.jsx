const VARIANT_CLASSES = {
  primary: 'bg-brand-600 text-white shadow-md shadow-brand-700/20 hover:bg-brand-700',
  secondary: 'border border-line bg-white text-ink hover:bg-surface',
  danger: 'bg-danger-500 text-white shadow-md shadow-danger-500/20 hover:bg-danger-600',
}

const SIZE_CLASSES = {
  md: 'h-11 px-5 text-sm',
  sm: 'h-9 px-3.5 text-sm',
}

function ActionButton({
  label,
  icon: Icon,
  variant = 'primary',
  size = 'md',
  type = 'button',
  onClick,
  disabled = false,
  isFullWidth = false,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${isFullWidth ? 'w-full' : ''}`}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {label}
    </button>
  )
}

export default ActionButton
