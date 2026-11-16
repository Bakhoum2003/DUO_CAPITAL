import { ChevronLeftIcon, ChevronRightIcon } from '../../icons'
import IconButton from '../common/IconButton'

function MonthNavigator({ monthLabel, canGoPrevious, canGoNext, onPrevious, onNext }) {
  return (
    <div className="flex items-center gap-2">
      <IconButton
        icon={ChevronLeftIcon}
        label="Mois précédent"
        onClick={onPrevious}
        disabled={!canGoPrevious}
        hasBorder
      />
      <p aria-live="polite" className="min-w-36 text-center text-base font-bold text-ink">
        {monthLabel}
      </p>
      <IconButton icon={ChevronRightIcon} label="Mois suivant" onClick={onNext} disabled={!canGoNext} hasBorder />
    </div>
  )
}

export default MonthNavigator
