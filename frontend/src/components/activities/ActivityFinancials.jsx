import { CircleArrowDownIcon, CircleArrowUpIcon, ScaleBalancedIcon, WalletIcon } from '../../icons'
import { formatCurrency, formatSignedAmount } from '../../utils/formatters'
import SummaryCard from '../dashboard/SummaryCard'

/**
 * Totaux financiers de l'activité, en LECTURE SEULE, tels que calculés par le serveur (financials). Aucun recalcul ici.
 * Les opérations (investissements, dépenses, recettes) se gèrent séparément. Props : financials, operationsCount.
 */
function ActivityFinancials({ financials, operationsCount }) {
  if (!financials) return <p className="text-sm text-ink-soft">Les informations financières ne sont pas disponibles.</p>
  const { investments, expenses, revenues, result } = financials
  const count = (item) => `${item.count} opération(s)`
  return (
    <section aria-label="Informations financières" className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Investissements" amount={investments.amount} footnote={count(investments)} icon={WalletIcon} tone="blue" />
        <SummaryCard title="Dépenses" amount={expenses.amount} footnote={count(expenses)} icon={CircleArrowDownIcon} tone="orange" />
        <SummaryCard title="Recettes" amount={revenues.amount} footnote={count(revenues)} icon={CircleArrowUpIcon} tone="green" />
        <SummaryCard title="Résultat" valueLabel={`${formatSignedAmount(result)} FCFA`} footnote="Recettes − dépenses" icon={ScaleBalancedIcon} tone={result < 0 ? 'red' : 'violet'} />
      </div>
      <p className="text-sm text-ink-soft">
        {operationsCount === 0 ? "Aucune opération financière n'est encore rattachée à cette activité." : `${operationsCount} opération(s) rattachée(s). Montant investi : ${formatCurrency(investments.amount)}.`} Les opérations sont gérées séparément de la fiche activité.
      </p>
    </section>
  )
}

export default ActivityFinancials
