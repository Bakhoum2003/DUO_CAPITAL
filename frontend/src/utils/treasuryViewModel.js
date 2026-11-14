// Logique PURE du module Trésorerie (sans React ni réseau) : filtres, libellés, cartes, formatage.
// Le backend est la source de vérité : tous les montants viennent de l'API ; ici on ne fait que de la présentation
// (aucune addition de montants, aucun solde recalculé).

import { formatNumber, formatShortDate } from './formatters'

export const PAGE_SIZE = 20
const DATE = /^\d{4}-\d{2}-\d{2}$/

export const DEFAULT_FILTERS = Object.freeze({ search: '', type: '', direction: '', category: '', partnerId: '', from: '', to: '', sort: 'date_desc', page: 1 })

/** Types de mouvements : libellé, sens et teinte du badge. Les entrées sont vertes, les sorties rouges ou orange. */
export const TYPE_META = Object.freeze({
  CONTRIBUTION: { label: 'Cotisation', direction: 'IN', tone: 'success' },
  REVENUE: { label: 'Recette commerciale', direction: 'IN', tone: 'info' },
  INVESTMENT: { label: 'Investissement', direction: 'OUT', tone: 'warning' },
  EXPENSE: { label: 'Dépense', direction: 'OUT', tone: 'danger' },
  WITHDRAWAL: { label: 'Retrait', direction: 'OUT', tone: 'neutral' },
})
export const getTypeMeta = (type) => TYPE_META[type] ?? { label: 'Mouvement', direction: 'OUT', tone: 'neutral' }

export const TYPE_OPTIONS = [{ value: '', label: 'Tous les types' }, ...Object.entries(TYPE_META).map(([value, meta]) => ({ value, label: meta.label }))]
export const DIRECTION_OPTIONS = [
  { value: '', label: 'Entrées et sorties' },
  { value: 'IN', label: 'Entrées' },
  { value: 'OUT', label: 'Sorties' },
]
export const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Date : plus récents' },
  { value: 'date_asc', label: 'Date : plus anciens' },
  { value: 'amount_desc', label: 'Montant : décroissant' },
  { value: 'amount_asc', label: 'Montant : croissant' },
]
export const DIRECTION_LABELS = Object.freeze({ IN: 'Entrée', OUT: 'Sortie' })

export const hasActiveFilters = (filters) => ['search', 'type', 'direction', 'category', 'partnerId', 'from', 'to'].some((key) => Boolean(filters[key]))

/** Erreur de saisie des filtres (dates), ou null. */
export function validateFilters(filters) {
  if (filters.from && !DATE.test(filters.from)) return 'La date de début est invalide.'
  if (filters.to && !DATE.test(filters.to)) return 'La date de fin est invalide.'
  if (filters.from && filters.to && filters.from > filters.to) return 'La date de fin ne peut pas précéder la date de début.'
  return null
}

/** URL de l'historique : seuls les filtres renseignés sont envoyés, avec les noms de paramètres exacts du backend. */
export function buildMovementsPath(filters = DEFAULT_FILTERS) {
  const params = new URLSearchParams()
  for (const key of ['search', 'type', 'direction', 'category', 'partnerId', 'from', 'to']) {
    if (filters[key]) params.set(key, filters[key])
  }
  params.set('sort', filters.sort || DEFAULT_FILTERS.sort)
  params.set('page', String(filters.page || 1))
  params.set('pageSize', String(PAGE_SIZE))
  return `/api/v1/treasury/movements?${params.toString()}`
}

export const movementPath = (type, id) => `/api/v1/treasury/movements/${encodeURIComponent(type)}/${encodeURIComponent(id)}`

/** « 45 000 FCFA » ; un montant négatif garde son signe (« −10 000 FCFA ») : un déficit n'est jamais masqué. */
export function formatMoney(amount) {
  if (!Number.isFinite(amount)) return '—'
  return `${amount < 0 ? '−' : ''}${formatNumber(Math.abs(amount))} FCFA`
}

/** Montant d'un mouvement avec son sens : « + 20 000 FCFA » (entrée) ou « − 5 000 FCFA » (sortie). */
export function formatMovementAmount(amount, direction) {
  return `${direction === 'IN' ? '+' : '−'} ${formatNumber(amount)} FCFA`
}

export const formatLastMovement = (isoDate) => (isoDate ? formatShortDate(isoDate) : 'Aucun mouvement')

/** « 2026-12 » → « décembre 2026 » (étiquettes de l'évolution). */
export function formatMonthKey(key) {
  const [year, month] = String(key).split('-').map(Number)
  if (!year || !month) return String(key)
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

/** Cartes de synthèse : valeurs de l'API uniquement. `—` si la synthèse n'est pas chargée (jamais un faux 0). */
export function buildSummaryCards(summary) {
  const money = (value) => (summary ? formatMoney(value) : '—')
  const count = (item) => (summary ? `${item.count} mouvement(s)` : '')
  return [
    { id: 'balance', title: 'Solde disponible', valueLabel: money(summary?.balance), footnote: summary ? `Au ${formatShortDate(summary.asOf)} · mouvements futurs exclus` : '', tone: summary && summary.balance < 0 ? 'red' : 'green' },
    { id: 'inflow', title: 'Total des entrées', valueLabel: money(summary?.inflow), footnote: 'Cotisations + recettes commerciales', tone: 'blue' },
    { id: 'outflow', title: 'Total des sorties', valueLabel: money(summary?.outflow), footnote: 'Investissements + dépenses + retraits', tone: 'orange' },
    { id: 'contributions', title: 'Cotisations', valueLabel: money(summary?.contributions.amount), footnote: summary ? `${count(summary.contributions)} · capital apporté` : '', tone: 'violet' },
    { id: 'revenues', title: 'Recettes commerciales', valueLabel: money(summary?.revenues.amount), footnote: summary ? `${count(summary.revenues)} · distinctes du capital` : '', tone: 'green' },
  ]
}

/** Lignes de la carte « Investissements et dépenses » : deux montants distincts. */
export function buildSpendingRows(summary) {
  if (!summary) return []
  return [
    { id: 'investments', label: 'Investissements', amountLabel: formatMoney(summary.investments.amount), count: summary.investments.count },
    { id: 'expenses', label: 'Dépenses', amountLabel: formatMoney(summary.expenses.amount), count: summary.expenses.count },
  ]
}

/** Décomposition du solde : une ligne par composante, avec son effet (+ ou −) selon l'API. */
export function buildFormulaRows(components) {
  return (Array.isArray(components) ? components : []).map((component) => ({
    id: component.type,
    label: component.label,
    sign: component.effect === 'INCREASE' ? '+' : '−',
    increases: component.effect === 'INCREASE',
    amountLabel: formatMoney(component.amount),
    count: component.count,
  }))
}

export const isHttpUrl = (value) => /^https?:\/\/\S+$/i.test(value ?? '')

/** Lignes du détail d'un mouvement : uniquement les informations réellement renvoyées par l'API (rien d'inventé). */
export function buildDetailRows(movement) {
  const rows = []
  const add = (label, value) => {
    if (value !== null && value !== undefined && value !== '') rows.push({ label, value })
  }
  const { details = {} } = movement
  add('Type', getTypeMeta(movement.type).label)
  add('Sens', DIRECTION_LABELS[movement.direction])
  add('Montant', formatMovementAmount(movement.amount, movement.direction))
  add('Date effective', formatShortDate(movement.date))
  add('Description', movement.description)
  add('Catégorie', movement.category)
  add('Activité', movement.activity ? movement.activity.name : null)
  add('Associé concerné', movement.partner?.name)
  add('Enregistré par', movement.recordedBy?.name)
  add('Mois concerné', details.period)
  add('Note', details.note)
  add('Motif du retrait', details.reason)
  add('Justificatif', details.receipt?.reference)
  add('Pris en compte dans le solde', movement.countedInBalance ? 'Oui' : "Non : mouvement daté dans le futur")
  return rows
}
