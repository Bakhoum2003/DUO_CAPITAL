import { BriefcaseIcon, HandHoldingDollarIcon, RocketIcon, WalletIcon } from '../icons'

export function buildSummaryCards(summary) {
  return [
    {
      id: 'availableCapital',
      title: 'Capital disponible',
      amount: summary.availableCapital.amount,
      icon: WalletIcon,
      tone: 'green',
      trendAmount: summary.availableCapital.monthlyChange,
      indicator: 'trend',
    },
    {
      id: 'totalContributions',
      title: 'Total cotisé',
      amount: summary.totalContributions.amount,
      icon: HandHoldingDollarIcon,
      tone: 'green',
      footnote: `(${summary.totalContributions.monthsCount} mois)`,
      indicator: 'check',
    },
    {
      id: 'totalInvestments',
      title: 'Total investi',
      amount: summary.totalInvestments.amount,
      icon: BriefcaseIcon,
      tone: 'blue',
      footnote: `${summary.totalInvestments.businessCount} business`,
      indicator: 'bars',
    },
    {
      id: 'cumulativeProfit',
      title: 'Bénéfices cumulés',
      amount: summary.cumulativeProfit.amount,
      icon: RocketIcon,
      tone: 'red',
      trendAmount: summary.cumulativeProfit.monthlyChange,
      indicator: 'trend',
    },
  ]
}
