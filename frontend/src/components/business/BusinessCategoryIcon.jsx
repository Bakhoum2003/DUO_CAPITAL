import { TONE_STYLES } from '../../constants/toneStyles'
import { getBusinessCategory } from '../../constants/businessSettings'

const SIZE_CLASSES = {
  md: { tile: 'h-12 w-12', icon: 'h-6 w-6' },
  lg: { tile: 'h-14 w-14', icon: 'h-7 w-7' },
}

function BusinessCategoryIcon({ category, size = 'md' }) {
  const { icon: CategoryIcon, tone } = getBusinessCategory(category)
  const toneStyle = TONE_STYLES[tone]

  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl ${toneStyle.tile} ${SIZE_CLASSES[size].tile}`}>
      <CategoryIcon className={`${toneStyle.icon} ${SIZE_CLASSES[size].icon}`} aria-hidden="true" />
    </span>
  )
}

export default BusinessCategoryIcon
