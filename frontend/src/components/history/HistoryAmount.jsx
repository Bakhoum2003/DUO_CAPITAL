import { DIRECTIONS } from '../../constants/historySettings'
import { formatCurrency } from '../../utils/formatters'

function HistoryAmount({ direction, amount }) {
  const { sign, textClass } = DIRECTIONS[direction]

  return (
    <span className={`whitespace-nowrap font-bold ${textClass}`}>
      {sign}
      {formatCurrency(amount)}
    </span>
  )
}

export default HistoryAmount
