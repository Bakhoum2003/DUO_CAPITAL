import { formatCurrency } from '../../utils/formatters'

const TYPE_STYLES = {
  investment: { sign: '+', className: 'text-blue-700' },
  expense: { sign: '−', className: 'text-danger-600' },
  revenue: { sign: '+', className: 'text-brand-700' },
}

function OperationAmount({ type, amount }) {
  const style = TYPE_STYLES[type]

  return (
    <span className={`whitespace-nowrap font-bold ${style.className}`}>
      {style.sign}
      {formatCurrency(amount)}
    </span>
  )
}

export default OperationAmount
