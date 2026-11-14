import { ArrowsRotateIcon, BuildingColumnsIcon, BuildingIcon, CoinsIcon, MoneyBillWaveIcon, PiggyBankIcon, ReceiptIcon, ScaleBalancedIcon, TagsIcon, UsersIcon, WalletIcon } from '../../icons'
import { useState } from 'react'
import FormError from '../../components/common/FormError'
import BreakdownChart from '../../components/dashboard/BreakdownChart'
import ContributionsOverview from '../../components/dashboard/ContributionsOverview'
import DashboardNotices from '../../components/dashboard/DashboardNotices'
import ContributionReminderBanner from '../../components/notifications/ContributionReminderBanner'
import EvolutionChart from '../../components/dashboard/EvolutionChart'
import PeriodFilter from '../../components/dashboard/PeriodFilter'
import RecentActivity from '../../components/dashboard/RecentActivity'
import SummaryCard from '../../components/dashboard/SummaryCard'
import useDashboard from '../../hooks/useDashboard'
import { DEFAULT_FILTER, buildKpiCards } from '../../utils/dashboardViewModel'

const KPI_ICONS = {
  treasury: WalletIcon,
  capital: BuildingColumnsIcon,
  investments: PiggyBankIcon,
  expenses: ReceiptIcon,
  revenues: MoneyBillWaveIcon,
  result: ScaleBalancedIcon,
  contributions: CoinsIcon,
  remaining: CoinsIcon,
}

/**
 * Dashboard financier commun aux deux associés. Tous les montants viennent du serveur (GET /api/v1/dashboard) ;
 * aucune donnée fictive. États distincts : chargement, erreur (avec « Réessayer »), base vide, zéro réel.
 */
function DashboardPage() {
  const [filter, setFilter] = useState(DEFAULT_FILTER)
  const { status, data, errorMessage, refresh } = useDashboard(filter)
  const isBusy = status === 'loading' || status === 'refreshing'

  const toolbar = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <PeriodFilter filter={filter} onChange={setFilter} disabled={isBusy && !data} />
      <button
        type="button"
        onClick={refresh}
        disabled={isBusy}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:bg-brand-50 disabled:opacity-60"
      >
        <ArrowsRotateIcon className={`h-4 w-4 ${isBusy ? 'animate-spin' : ''}`} aria-hidden="true" />
        Actualiser
      </button>
    </div>
  )

  if (!data) {
    return (
      <div className="space-y-5">
        {toolbar}
        {status === 'error' ? (
          <div className="space-y-3">
            <FormError variant="banner" message={errorMessage} />
            <button type="button" onClick={refresh} className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">
              Réessayer
            </button>
          </div>
        ) : (
          <p role="status" className="py-16 text-center text-sm text-ink-soft">Chargement du tableau de bord…</p>
        )}
      </div>
    )
  }

  const cards = buildKpiCards(data)

  return (
    <div className="space-y-5" aria-busy={isBusy}>
      {toolbar}

      {status === 'error' && (
        <div className="space-y-2">
          <FormError variant="banner" message={`${errorMessage} Les chiffres affichés peuvent être périmés.`} />
          <button type="button" onClick={refresh} className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">Réessayer</button>
        </div>
      )}

      {!data.hasAnyData && (
        <p role="status" className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink-soft">
          Aucune opération n'est encore enregistrée : les montants à 0 FCFA sont réels, pas des erreurs.
        </p>
      )}

      <ContributionReminderBanner />

      <DashboardNotices notices={data.notices} />

      <section aria-label="Indicateurs financiers" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <SummaryCard key={card.id} title={card.title} valueLabel={card.valueLabel} icon={KPI_ICONS[card.iconKey]} tone={card.tone} footnote={card.footnote} />
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <EvolutionChart evolution={data.charts.evolution} periodLabel={data.period.label} />
        <ContributionsOverview contributions={data.contributions} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <BreakdownChart title="Investissements par activité" icon={BuildingIcon} rows={data.charts.investmentsByBusiness} color="#7c3aed" emptyMessage="Aucun investissement sur cette période." />
        <BreakdownChart title="Dépenses par catégorie" icon={TagsIcon} rows={data.charts.expensesByCategory} color="#e11d2a" emptyMessage="Aucune dépense sur cette période." />
        <BreakdownChart title="Capital par associé" icon={UsersIcon} rows={data.charts.contributionsByPartner} color="#0c8236" emptyMessage="Aucune cotisation versée à ce jour." />
      </div>

      <RecentActivity activities={data.recentActivities} />
    </div>
  )
}

export default DashboardPage
