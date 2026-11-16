import { DIRECTIONS, HISTORY_TYPES } from '../../constants/historySettings'
import { TONE_STYLES } from '../../constants/toneStyles'

const SIZE_CLASSES = {
  sm: { tile: 'h-10 w-10', icon: 'h-5 w-5' },
  lg: { tile: 'h-14 w-14', icon: 'h-7 w-7' },
}

function HistoryEntryIcon({ type, direction, size = 'sm' }) {
  const { icon: TypeIcon } = HISTORY_TYPES[type]
  const toneStyle = TONE_STYLES[DIRECTIONS[direction].tileTone]

  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl ${toneStyle.tile} ${SIZE_CLASSES[size].tile}`}>
      <TypeIcon className={`${toneStyle.icon} ${SIZE_CLASSES[size].icon}`} aria-hidden="true" />
    </span>
  )
}

export default HistoryEntryIcon
