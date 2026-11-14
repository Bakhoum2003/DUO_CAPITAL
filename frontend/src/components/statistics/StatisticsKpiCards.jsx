import { ArrowTrendUpIcon, CoinsIcon, MoneyBillTransferIcon, ReceiptIcon, ScaleBalancedIcon, StoreIcon } from '../../icons'
import StatisticsKpiCard from './StatisticsKpiCard'

/**
 * Les six indicateurs principaux de la période.
 *
 * Props :
 * - totals : { contributions, investments, expenses, revenues, commercialResult, netBalance }
 * - comparison : { [indicateur]: { percent, trend } | null } (évolution vs période précédente)
 */
function StatisticsKpiCards({ totals, comparison }) {
  return (
    <section aria-label="Indicateurs principaux" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatisticsKpiCard
        title="Total des cotisations"
        amount={totals.contributions}
        icon={CoinsIcon}
        tone="green"
        variation={comparison.contributions}
        footnote="Versements des associés"
      />
      <StatisticsKpiCard
        title="Total investi"
        amount={totals.investments}
        icon={StoreIcon}
        tone="violet"
        variation={comparison.investments}
        isNeutralTrend
        footnote="Investissements initiaux et supplémentaires"
      />
      <StatisticsKpiCard
        title="Total des dépenses"
        amount={totals.expenses}
        icon={ReceiptIcon}
        tone="red"
        variation={comparison.expenses}
        isNeutralTrend
        footnote="Dépenses d'exploitation des activités"
      />
      <StatisticsKpiCard
        title="Total des recettes"
        amount={totals.revenues}
        icon={MoneyBillTransferIcon}
        tone="blue"
        variation={comparison.revenues}
        footnote="Ventes et encaissements"
      />
      <StatisticsKpiCard
        title="Résultat commercial global"
        amount={totals.commercialResult}
        isSigned
        icon={ArrowTrendUpIcon}
        tone={totals.commercialResult < 0 ? 'orange' : 'green'}
        variation={comparison.commercialResult}
        footnote="Recettes − dépenses − investissements"
      />
      <StatisticsKpiCard
        title="Solde net des mouvements"
        amount={totals.netBalance}
        isSigned
        icon={ScaleBalancedIcon}
        tone={totals.netBalance < 0 ? 'red' : 'blue'}
        variation={comparison.netBalance}
        footnote="Entrées réelles − sorties réelles"
      />
    </section>
  )
}

export default StatisticsKpiCards
