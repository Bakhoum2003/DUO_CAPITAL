import { ArrowTrendDownIcon, ArrowTrendUpIcon, BuildingColumnsIcon, CalculatorIcon, CartShoppingIcon, CoinsIcon, HashtagIcon, MoneyBillWaveIcon, ReceiptIcon, WalletIcon } from '../../icons'
import SummaryCard from '../dashboard/SummaryCard'

const ICONS = { inflow: ArrowTrendUpIcon, outflow: ArrowTrendDownIcon, net: BuildingColumnsIcon, count: HashtagIcon, contributions: CoinsIcon, revenues: ReceiptIcon, investments: CartShoppingIcon, expenses: WalletIcon, withdrawals: MoneyBillWaveIcon, result: CalculatorIcon }
const render = (card) => <SummaryCard key={card.id} title={card.title} valueLabel={card.valueLabel} footnote={card.footnote} tone={card.tone} icon={ICONS[card.id]} />

function OperationsStatCards({ main, extra }) {
  return (
    <div className="space-y-4">
      <section aria-label="Totaux de l'historique" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{main.map(render)}</section>
      <section aria-label="Détail par type d'opération" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{extra.map(render)}</section>
    </div>
  )
}

export default OperationsStatCards
