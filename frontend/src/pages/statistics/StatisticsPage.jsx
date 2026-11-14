import { ArrowsRotateIcon } from '../../icons'
import ActionButton from '../../components/common/ActionButton'
import FormError from '../../components/common/FormError'
import PageHeader from '../../components/common/PageHeader'
import ActivityAnalysis from '../../components/statistics/ActivityAnalysis'
import BusinessPerformanceChart from '../../components/statistics/BusinessPerformanceChart'
import ContributionComparisonSection from '../../components/statistics/ContributionComparisonSection'
import ExpenseBreakdownChart from '../../components/statistics/ExpenseBreakdownChart'
import FinancialEvolutionChart from '../../components/statistics/FinancialEvolutionChart'
import StatisticsChartCard from '../../components/statistics/StatisticsChartCard'
import StatisticsKpiCards from '../../components/statistics/StatisticsKpiCards'
import StatisticsPeriodFilter from '../../components/statistics/StatisticsPeriodFilter'
import useStatistics from '../../hooks/useStatistics'
import useStatisticsPeriod from '../../hooks/useStatisticsPeriod'
import { formatDateTime } from '../../utils/activitiesViewModel'

/**
 * Page « Statistiques » : indicateurs, graphiques et analyse des activités de la période choisie.
 * Toutes les données viennent de l'API (le serveur calcule tout, à partir des opérations réelles) ; aucune donnée fictive.
 * Chargement, erreur, période invalide et absence d'opération sont distincts, et une erreur n'est jamais remplacée par des
 * zéros. Les chiffres d'une ancienne période ne restent jamais affichés après un changement de filtre.
 */
function StatisticsPage() {
  const period = useStatisticsPeriod()
  const { status, stats, errorMessage, periodError, refresh } = useStatistics(period)
  const isBusy = status === 'loading' || status === 'refreshing'

  const header = (
    <div className="space-y-2">
      <PageHeader
        title="Statistiques"
        description="Analysez l'évolution du fonds : cotisations, investissements, dépenses, recettes et résultats des activités."
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">{stats ? `Dernière actualisation : ${formatDateTime(stats.generatedAt)}` : ''}</p>
        <ActionButton label="Actualiser" icon={ArrowsRotateIcon} variant="secondary" size="sm" disabled={isBusy || Boolean(periodError)} onClick={refresh} />
      </div>
    </div>
  )

  const filter = (
    <StatisticsPeriodFilter
      periodKey={period.periodKey}
      customStartDate={period.customStartDate}
      customEndDate={period.customEndDate}
      onPeriodChange={period.setPeriodKey}
      onStartDateChange={period.setCustomStartDate}
      onEndDateChange={period.setCustomEndDate}
      onReset={period.resetPeriod}
      canReset={!period.isDefaultPeriod}
      periodLabel={periodError ? 'Période invalide' : (stats?.periodLabel ?? 'Chargement…')}
      periodError={periodError}
    />
  )

  if (periodError || !stats) {
    return (
      <div className="space-y-6">
        {header}
        {filter}
        {status === 'error' && (
          <div className="space-y-2">
            <FormError message={errorMessage} variant="banner" />
            <ActionButton label="Réessayer" icon={ArrowsRotateIcon} size="sm" onClick={refresh} />
          </div>
        )}
        {status === 'loading' && <p role="status" className="py-16 text-center text-ink-soft">Chargement des statistiques…</p>}
      </div>
    )
  }

  const hasMonths = stats.monthly.length > 0

  return (
    <div className="space-y-6" aria-busy={isBusy}>
      {header}
      {filter}

      {status === 'error' && (
        <div className="space-y-2">
          <FormError message={errorMessage} variant="banner" />
          <ActionButton label="Réessayer" icon={ArrowsRotateIcon} size="sm" onClick={refresh} />
        </div>
      )}

      {!stats.hasMovements && <FormError message="Aucune opération sur cette période : les montants sont à zéro." variant="banner" tone="info" />}

      <div className={isBusy ? 'space-y-6 opacity-70 transition' : 'space-y-6 transition'}>
        <StatisticsKpiCards totals={stats.totals} comparison={stats.comparison} />

        {stats.notices.map((notice) => (
          <FormError key={notice.code} message={notice.message} variant="banner" tone="info" />
        ))}

        <div className="grid gap-6 xl:grid-cols-2">
          <StatisticsChartCard
            title="Évolution mensuelle"
            description="Cotisations, investissements, dépenses et recettes mois par mois."
            chartElement={<FinancialEvolutionChart data={stats.monthly} />}
            isEmpty={!hasMonths || !stats.hasMovements}
            emptyMessage="Aucune opération sur cette période."
          />
          <StatisticsChartCard
            title="Répartition des dépenses"
            description="Part de chaque catégorie d'activité dans les dépenses de la période."
            chartElement={<ExpenseBreakdownChart data={stats.expenseBreakdown} />}
            isEmpty={stats.expenseBreakdown.length === 0}
            emptyMessage="Aucune dépense sur cette période."
          />
        </div>

        <StatisticsChartCard
          title="Performance des activités"
          description="Montant investi, dépenses, recettes et résultat de chaque activité."
          chartElement={<BusinessPerformanceChart data={stats.performance} />}
          isEmpty={stats.performance.length === 0}
          emptyMessage="Aucune activité n'a d'opération sur cette période."
        />

        <ContributionComparisonSection
          stats={stats.associateStats}
          monthlyData={stats.monthlyContributions}
          monthlyTarget={stats.monthlyTarget}
          isEmpty={!hasMonths}
        />

        <ActivityAnalysis performance={stats.performance} summary={stats.activitySummary} />
      </div>
    </div>
  )
}

export default StatisticsPage
