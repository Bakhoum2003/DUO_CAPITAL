
import { getActivitySummary, compareTotals } from './statisticsCalculations'
import { getResultKind } from './businessCalculations'
import { formatMonthLabel, formatShortDate } from './formatters'

const DATE = /^\d{4}-\d{2}-\d{2}$/
const API_PERIODS = { '3months': 'last3months', '6months': 'last6months' }
const ASSOCIATE_TONES = ['green', 'red']

export const toApiPeriod = (periodKey) => API_PERIODS[periodKey] ?? periodKey

export function validatePeriod({ periodKey, customStartDate = '', customEndDate = '' }) {
  if (periodKey !== 'custom') return ''
  if (!customStartDate || !customEndDate) return 'Choisissez une date de début et une date de fin pour la période personnalisée.'
  if (!DATE.test(customStartDate) || !DATE.test(customEndDate)) return 'Les dates de la période sont invalides.'
  if (customStartDate > customEndDate) return 'La date de début doit être antérieure ou égale à la date de fin.'
  return ''
}

export function buildStatisticsPath({ periodKey, customStartDate = '', customEndDate = '' }) {
  const params = new URLSearchParams({ period: toApiPeriod(periodKey) })
  if (periodKey === 'custom') {
    params.set('from', customStartDate)
    params.set('to', customEndDate)
  }
  return `/api/v1/statistics?${params.toString()}`
}

export const periodCacheKey = (period) => buildStatisticsPath(period)

export const selectForKey = (stored, key) => (stored && stored.key === key ? stored.payload : null)

export function deriveStatus({ periodError, loadStatus, hasData }) {
  if (periodError) return 'idle'
  if (loadStatus === 'error') return 'error'
  if (!hasData) return 'loading'
  return loadStatus === 'refreshing' || loadStatus === 'loading' ? 'refreshing' : 'ready'
}

function shortMonth(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' }).format(new Date(Date.UTC(year, month - 1, 1)))
}

const initialsOf = (name) =>
  String(name ?? '')
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

export function describePeriod(period) {
  if (!period) return ''
  if (period.key === 'all') return 'Toute la période'
  if (period.from && period.to) return `Du ${formatShortDate(period.from)} au ${formatShortDate(period.to)}`
  return period.label
}

/**
 * Adapte la réponse de GET /api/v1/statistics aux composants existants.
 * Comparaison avec la période précédente : uniquement si le serveur en fournit une ET qu'elle contient des opérations
 * (sinon null : aucun pourcentage inventé).
 */
export function adaptStatistics(payload) {
  const totals = {
    contributions: payload.totals.contributions.amount,
    investments: payload.totals.investments.amount,
    expenses: payload.totals.expenses.amount,
    revenues: payload.totals.revenues.amount,
    withdrawals: payload.totals.withdrawals.amount,
    commercialResult: payload.totals.commercialResult,
    netBalance: payload.totals.netBalance,
  }
  const previous = payload.previousPeriod?.hasMovements ? payload.previousPeriod.totals : null

  const performance = payload.activities.map((activity) => ({
    businessId: activity.id,
    name: activity.name,
    status: activity.isProvisional ? 'ongoing' : 'completed', // vocabulaire des composants (en cours = résultat provisoire)
    invested: activity.investments,
    expenses: activity.expenses,
    revenues: activity.revenues,
    result: activity.result,
    kind: getResultKind(activity.result),
  }))

  const comparison = payload.contributionComparison
  const associateStats = comparison.partners.map((partner, index) => ({
    associate: { id: partner.partnerId, name: partner.name, initials: initialsOf(partner.name), avatarTone: ASSOCIATE_TONES[index % ASSOCIATE_TONES.length] },
    total: partner.contributed, // montant réel, jamais plafonné
    count: partner.contributionsCount,
    target: partner.target ?? 0,
    percent: partner.percent ?? 0, // plafonné à 100 par le serveur
    remaining: partner.remaining ?? 0,
    isComplete: partner.status === 'ACHIEVED',
  }))
  const monthlyContributions = payload.monthly.map((row) => {
    const result = { monthKey: row.month, label: formatMonthLabel(row.month), shortLabel: shortMonth(row.month) }
    for (const partner of comparison.partners) result[partner.partnerId] = partner.months.find((month) => month.month === row.month)?.contributed ?? 0
    return result
  })

  return {
    periodLabel: describePeriod(payload.period),
    isPeriodEmpty: Boolean(payload.period.isEmpty),
    totals,
    comparison: compareTotals(totals, previous),
    monthly: payload.monthly.map((row) => ({
      monthKey: row.month,
      label: formatMonthLabel(row.month),
      shortLabel: shortMonth(row.month),
      contributions: row.contributions,
      investments: row.investments,
      expenses: row.expenses,
      revenues: row.revenues,
      withdrawals: row.withdrawals,
    })),
    expenseBreakdown: payload.expensesByCategory.map((row) => ({ label: row.label, amount: row.amount, percent: row.percent })),
    performance,
    activitySummary: getActivitySummary(performance),
    associateStats,
    monthlyContributions,
    monthlyTarget: comparison.monthlyTarget,
    objectiveAvailable: comparison.objectiveAvailable,
    hasMovements: payload.totals.operationsCount > 0,
    operationsCount: payload.totals.operationsCount,
    notices: payload.notices ?? [],
    generatedAt: payload.generatedAt,
  }
}
