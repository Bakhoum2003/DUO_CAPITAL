// ici on ne fait que de la présentation (aucune addition de montants, aucun solde recalculé).

import { formatShortDate } from './formatters'
import { DIRECTION_OPTIONS, TYPE_OPTIONS, buildDetailRows, formatMoney } from './treasuryViewModel'

export const PAGE_SIZE_OPTIONS = Object.freeze([10, 20, 50])
export const DEFAULT_LIMIT = 20
const DATE = /^\d{4}-\d{2}-\d{2}$/

export const DEFAULT_FILTERS = Object.freeze({ search: '', type: '', direction: '', partnerId: '', activityId: '', period: 'all', from: '', to: '', sort: 'date_desc', page: 1, limit: DEFAULT_LIMIT })

export { DIRECTION_OPTIONS, TYPE_OPTIONS }
export const PERIOD_OPTIONS = [
  { value: 'all', label: 'Toute la période' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: 'quarter', label: 'Ce trimestre' },
  { value: 'year', label: 'Cette année' },
  { value: 'custom', label: 'Période personnalisée' },
]
export const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Date : plus récentes' },
  { value: 'date_asc', label: 'Date : plus anciennes' },
  { value: 'amount_desc', label: 'Montant : du plus élevé' },
  { value: 'amount_asc', label: 'Montant : du plus faible' },
]
export const NO_ACTIVITY_VALUE = 'none'

const FILTER_KEYS = ['search', 'type', 'direction', 'partnerId', 'activityId', 'from', 'to']
export const hasActiveFilters = (filters) => FILTER_KEYS.some((key) => Boolean(filters[key])) || filters.period !== DEFAULT_FILTERS.period

export function validateFilters(filters) {
  if (filters.from && !DATE.test(filters.from)) return 'La date de début est invalide.'
  if (filters.to && !DATE.test(filters.to)) return 'La date de fin est invalide.'
  if (filters.from && filters.to && filters.to < filters.from) return 'La date de fin ne peut pas précéder la date de début.'
  if (filters.period === 'custom' && !filters.from && !filters.to) return 'Choisissez une date de début ou de fin pour la période personnalisée.'
  return null
}

export function buildHistoryPath(filters = DEFAULT_FILTERS) {
  const params = new URLSearchParams()
  for (const key of FILTER_KEYS) {
    if (filters[key]) params.set(key, filters[key])
  }
  if (filters.period && filters.period !== DEFAULT_FILTERS.period) params.set('period', filters.period)
  params.set('sort', filters.sort || DEFAULT_FILTERS.sort)
  params.set('page', String(filters.page || 1))
  params.set('limit', String(filters.limit || DEFAULT_LIMIT))
  return `/api/v1/history?${params.toString()}`
}

export const operationPath = (type, id) => `/api/v1/history/${encodeURIComponent(type)}/${encodeURIComponent(id)}`

export function filtersReducer(state, action) {
  switch (action.type) {
    case 'set':
      return { ...state, [action.name]: action.value, page: 1 }
    case 'page':
      return { ...state, page: action.page }
    case 'reset':
      return { ...DEFAULT_FILTERS }
    default:
      return state
  }
}


function describeResult(result) {
  const kind = { PROFIT: 'Bénéfice', LOSS: 'Perte', BREAK_EVEN: 'Équilibre' }[result.kind] ?? 'Résultat'
  return `${kind}${result.isProvisional ? ' provisoire' : ''} · calcul, pas une entrée d'argent`
}

/** Cartes principales et complémentaires : valeurs de l'API uniquement. « — » tant que la synthèse n'est pas chargée. */
export function buildSummaryCards(summary) {
  const totals = summary?.totals
  const money = (value) => (totals ? formatMoney(value) : '—')
  const count = (item) => (totals ? `${item.count} opération(s)` : '')
  return {
    main: [
      { id: 'inflow', title: 'Total des entrées', valueLabel: money(totals?.inflow), footnote: 'Cotisations + revenus', tone: 'green' },
      { id: 'outflow', title: 'Total des sorties', valueLabel: money(totals?.outflow), footnote: 'Investissements + dépenses + retraits', tone: 'orange' },
      { id: 'net', title: 'Solde net', valueLabel: money(totals?.net), footnote: summary ? `Au ${formatShortDate(summary.asOf)} · opérations futures exclues` : '', tone: totals && totals.net < 0 ? 'red' : 'blue' },
      { id: 'count', title: "Nombre d'opérations", valueLabel: totals ? String(totals.operationsCount) : '—', footnote: 'opérations comptabilisées', tone: 'violet' },
    ],
    extra: [
      { id: 'contributions', title: 'Cotisations', valueLabel: money(totals?.contributions.amount), footnote: totals ? count(totals.contributions) : '', tone: 'violet' },
      { id: 'revenues', title: 'Revenus', valueLabel: money(totals?.revenues.amount), footnote: totals ? count(totals.revenues) : '', tone: 'green' },
      { id: 'investments', title: 'Investissements', valueLabel: money(totals?.investments.amount), footnote: totals ? count(totals.investments) : '', tone: 'orange' },
      { id: 'expenses', title: 'Dépenses', valueLabel: money(totals?.expenses.amount), footnote: totals ? count(totals.expenses) : '', tone: 'red' },
      { id: 'withdrawals', title: 'Retraits', valueLabel: money(totals?.withdrawals.amount), footnote: totals ? count(totals.withdrawals) : '', tone: 'blue' },
      {
        id: 'result',
        title: 'Résultat commercial',
        valueLabel: summary?.commercialResult ? formatMoney(summary.commercialResult.amount) : '—',
        footnote: summary?.commercialResult ? describeResult(summary.commercialResult) : '',
        tone: summary?.commercialResult && summary.commercialResult.amount < 0 ? 'red' : 'green',
      },
    ],
  }
}

export function buildOperationRows(operation) {
  const [type, ...rest] = buildDetailRows(operation)
  return [type, { label: 'Identifiant', value: operation.id }, ...rest].filter(Boolean)
}

export function buildFilterOptions(summary) {
  return {
    partners: [{ value: '', label: 'Tous les associés' }, ...(summary?.partners ?? []).map((partner) => ({ value: partner.id, label: partner.name }))],
    activities: [
      { value: '', label: 'Toutes les activités' },
      { value: NO_ACTIVITY_VALUE, label: 'Sans activité (cotisations, retraits)' },
      ...(summary?.activities ?? []).map((activity) => ({ value: activity.id, label: activity.name })),
    ],
  }
}
