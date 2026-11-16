const TONE_CLASSES = {
  green: 'bg-brand-600 text-white',
  red: 'bg-danger-500 text-white',
}

const SIZE_CLASSES = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
}

function Avatar({ initials, tone = 'green', size = 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${TONE_CLASSES[tone]} ${SIZE_CLASSES[size]}`}
    >
      {initials}
    </span>
  )
}

export default Avatar
