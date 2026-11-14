// Logique PURE du dashboard (sans React, testable en environnement node) : requêtes, validation du filtre,
// cartes d'indicateurs et libellés. Aucun total n'est recalculé ici : tout montant vient du serveur.

import { formatCurrency, formatNumber, formatSignedAmount } from './formatters'

export const PERIOD_OPTIONS = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'year', label: 'Année' },
  { key: 'all', label: 'Tout' },
  { key: 'custom', label: 'Personnalisé' },
]
export const DEFAULT_FILTER = Object.freeze({ period: 'all', from: '', to: '' })
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MAX_RANGE_DAYS = 3660

const toUtc = (date) => Date.UTC(...date.split('-').map((part, index) => Number(part) - (index === 1 ? 1 : 0)))

/** Message d'erreur du filtre personnalisé, ou null s'il est valide. */
export function validateCustomRange(from, to) {
  if (!DATE_PATTERN.test(from ?? '') || !DATE_PATTERN.test(to ?? '')) return 'Renseignez une date de début et une date de fin.'
  if (from > to) return 'La date de fin ne peut pas précéder la date de début.'
  if ((toUtc(to) - toUtc(from)) / 86_400_000 > MAX_RANGE_DAYS) return 'La période personnalisée est limitée à 10 ans.'
  return null
}

/** Un filtre est « prêt » s'il peut être envoyé au serveur (le personnalisé exige des dates valides). */
export const isFilterReady = (filter) => filter.period !== 'custom' || validateCustomRange(filter.from, filter.to) === null

export function buildDashboardPath({ period = 'all', from = '', to = '' } = {}) {
  const params = new URLSearchParams({ period })
  if (period === 'custom') {
    params.set('from', from)
    params.set('to', to)
  }
  return `/api/v1/dashboard?${params.toString()}`
}

const PERCENT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })
export const formatPercent = (value) => `${PERCENT.format(value)} %`

/** Cartes d'indicateurs : une valeur absente reste « Non calculable », jamais un faux 0. */
export function buildKpiCards(data) {
  const { treasury, capital, investments, expenses, revenues, result, contributions } = data
  const resultLabel =
    result.kind === 'BREAK_EVEN' ? formatCurrency(0) : `${formatSignedAmount(result.amount)} FCFA`
  const resultTitle = { PROFIT: 'Bénéfice', LOSS: 'Perte', BREAK_EVEN: 'Résultat' }[result.kind]

  return [
    { id: 'treasury', title: 'Trésorerie', iconKey: 'treasury', tone: treasury.balance < 0 ? 'red' : 'green', valueLabel: formatCurrency(treasury.balance), footnote: 'Entrées − sorties enregistrées' },
    { id: 'capital', title: 'Capital apporté', iconKey: 'capital', tone: 'blue', valueLabel: formatCurrency(capital.totalToDate), footnote: 'Cotisations réellement versées' },
    { id: 'investments', title: 'Investissements', iconKey: 'investments', tone: 'violet', valueLabel: formatCurrency(investments.total), footnote: `${formatNumber(investments.count)} opération(s)` },
    { id: 'expenses', title: 'Dépenses', iconKey: 'expenses', tone: 'red', valueLabel: formatCurrency(expenses.total), footnote: `${formatNumber(expenses.count)} dépense(s) · ${formatCurrency(expenses.thisMonth)} ce mois` },
    { id: 'revenues', title: 'Recettes', iconKey: 'revenues', tone: 'green', valueLabel: formatCurrency(revenues.total), footnote: `${formatNumber(revenues.count)} recette(s) · ${formatCurrency(revenues.thisMonth)} ce mois` },
    { id: 'result', title: resultTitle, iconKey: 'result', tone: result.kind === 'LOSS' ? 'red' : 'green', valueLabel: resultLabel, footnote: result.isProvisional ? 'Provisoire : activité en cours' : 'Recettes − dépenses' },
    {
      id: 'contributions',
      title: 'Cotisations versées',
      iconKey: 'contributions',
      tone: 'orange',
      valueLabel: formatCurrency(capital.periodContributions),
      footnote: contributions.expectedAvailable ? `Attendu : ${formatCurrency(contributions.expected)}` : 'Attendu : non calculable',
    },
    {
      id: 'remaining',
      title: 'Cotisations restantes',
      iconKey: 'remaining',
      tone: contributions.expectedAvailable && contributions.remaining > 0 ? 'red' : 'blue',
      valueLabel: contributions.expectedAvailable ? formatCurrency(contributions.remaining) : 'Non calculable',
      footnote: contributions.expectedAvailable ? `Réalisation : ${formatPercent(contributions.realizationRate)}` : 'Date de début du fonds non configurée',
    },
  ]
}

export const ACTIVITY_LABELS = {
  CONTRIBUTION: 'Cotisation',
  INVESTMENT: 'Investissement',
  EXPENSE: 'Dépense',
  REVENUE: 'Recette',
  WITHDRAWAL: 'Retrait',
}
export const ACTIVITY_STATUS_LABELS = { RECORDED: 'Enregistré' }
export const SITUATION_LABELS = {
  UP_TO_DATE: { label: 'À jour', tone: 'green' },
  PENDING: { label: 'En attente', tone: 'orange' },
  LATE: { label: 'En retard', tone: 'red' },
  NO_MONTH_DUE: { label: 'Aucun mois dû', tone: 'blue' },
  NOT_AVAILABLE: { label: 'Non calculable', tone: 'blue' },
}

/** « 12 000 FCFA » pour une entrée, « −12 000 FCFA » pour une sortie. */
export function formatActivityAmount(activity) {
  return activity.direction === 'IN' ? `+${formatCurrency(activity.amount)}` : `−${formatCurrency(activity.amount)}`
}

/** Aucune donnée à tracer ? (distingue « vide » de « zéro ») */
export const hasPoints = (points) => Array.isArray(points) && points.length > 0
export const hasAmounts = (rows) => Array.isArray(rows) && rows.some((row) => row.amount > 0)

/** Libellé court d'un point d'axe : « 05/11 » (jour) ou « nov. 26 » (mois). */
export function formatAxisKey(key, granularity) {
  if (granularity === 'day') {
    const [, month, day] = key.split('-')
    return `${day}/${month}`
  }
  const [year, month] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' }).format(new Date(Date.UTC(year, month - 1, 1)))
}
