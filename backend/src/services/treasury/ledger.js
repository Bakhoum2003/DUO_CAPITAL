// - solde = cotisations + recettes − investissements − dépenses − retraits ;
//   logiquement n'est jamais chargé ; aucun solde d'ouverture n'existe ;
// - un mouvement = un enregistrement d'origine = une ligne ; le bénéfice commercial n'est jamais ajouté au solde.

import { toNameKey } from '../../models/shared/validators.js'
import { buildSeries, normalizeMovements, signed } from '../dashboard/calculator.js'

export const MOVEMENT_TYPES = Object.freeze(['CONTRIBUTION', 'REVENUE', 'INVESTMENT', 'EXPENSE', 'WITHDRAWAL'])
export const DIRECTIONS = Object.freeze(['IN', 'OUT'])
export const TYPE_LABELS = Object.freeze({
  CONTRIBUTION: 'Cotisation',
  REVENUE: 'Recette commerciale',
  INVESTMENT: 'Investissement',
  EXPENSE: 'Dépense',
  WITHDRAWAL: 'Retrait',
})
export const SORTS = Object.freeze(['date_desc', 'date_asc', 'amount_desc', 'amount_asc'])
export const NO_ACTIVITY = 'none'

const SOURCE_BY_TYPE = Object.freeze({ CONTRIBUTION: 'contributions', REVENUE: 'operations', INVESTMENT: 'operations', EXPENSE: 'operations', WITHDRAWAL: 'withdrawals' })
const idOf = (value) => (value == null ? null : String(value))
const sum = (list, pick = (item) => item.amount) => list.reduce((total, item) => total + pick(item), 0)
const iso = (value) => (value instanceof Date ? value.toISOString() : (value ?? null))

export function buildMovements(sources) {
  return normalizeMovements(sources)
}

export function splitByToday(movements, today) {
  const realized = movements.filter((movement) => movement.date <= today)
  return { realized, future: movements.filter((movement) => movement.date > today) }
}

/** Solde et totaux de la trésorerie à la date `today`. Source unique du calcul (service de consultation ET garde des sorties). */
export function computeTreasury(sources, today) {
  const { realized, future } = splitByToday(buildMovements(sources), today)
  const of = (type) => realized.filter((movement) => movement.kind === type)
  const total = (type) => ({ amount: sum(of(type)), count: of(type).length })
  const contributions = total('CONTRIBUTION')
  const revenues = total('REVENUE')
  const investments = total('INVESTMENT')
  const expenses = total('EXPENSE')
  const withdrawals = total('WITHDRAWAL')
  const inflow = contributions.amount + revenues.amount
  const outflow = investments.amount + expenses.amount + withdrawals.amount
  const lastMovement = realized.reduce((last, movement) => (last == null || movement.date > last ? movement.date : last), null)
  const lastRecordedAt = realized.reduce((last, movement) => (movement.createdAt && (last == null || new Date(movement.createdAt) > new Date(last)) ? movement.createdAt : last), null)
  const earliest = realized.reduce((first, movement) => (first == null || movement.date < first ? movement.date : first), null)

  return {
    balance: sum(realized, signed),
    inflow,
    outflow,
    contributions,
    revenues,
    investments,
    expenses,
    withdrawals,
    movementsCount: realized.length,
    lastMovementDate: lastMovement,
    lastRecordedAt: iso(lastRecordedAt),
    futureIgnored: { count: future.length, amount: sum(future, signed) },
    evolution: earliest
      ? buildSeries({ movements: realized, from: earliest, to: today, granularity: 'month', openingBalance: 0, openingCapital: 0 })
      : { granularity: 'month', points: [] },
  }
}

/** Décomposition du solde (pour « comprendre le calcul ») : chaque ligne indique si elle augmente ou diminue la trésorerie. */
export function buildComponents(totals) {
  return [
    { type: 'CONTRIBUTION', label: 'Cotisations encaissées', effect: 'INCREASE', ...totals.contributions },
    { type: 'REVENUE', label: 'Recettes commerciales', effect: 'INCREASE', ...totals.revenues },
    { type: 'INVESTMENT', label: 'Investissements', effect: 'DECREASE', ...totals.investments },
    { type: 'EXPENSE', label: 'Dépenses', effect: 'DECREASE', ...totals.expenses },
    { type: 'WITHDRAWAL', label: 'Retraits', effect: 'DECREASE', ...totals.withdrawals },
  ]
}

/** Annuaires nécessaires à l'affichage (noms seulement : jamais d'email ni de secret). */
export function buildDirectories({ users, businesses }) {
  return {
    users: new Map(users.map((user) => [idOf(user._id), { id: idOf(user._id), name: user.name, partnerNumber: user.partnerNumber }])),
    businesses: new Map(businesses.map((business) => [idOf(business._id), { id: idOf(business._id), name: business.name, status: business.status, category: business.category ?? null }])),
  }
}

function indexSources(sources) {
  return {
    contributions: new Map(sources.contributions.map((doc) => [idOf(doc._id), doc])),
    operations: new Map(sources.operations.map((doc) => [idOf(doc._id), doc])),
    withdrawals: new Map(sources.withdrawals.map((doc) => [idOf(doc._id), doc])),
  }
}

export function toMovementView(movement, source, directories, today) {
  const business = movement.businessId ? (directories.businesses.get(movement.businessId) ?? null) : null
  const person = (id) => (id ? (directories.users.get(idOf(id)) ?? { id: idOf(id), name: null, partnerNumber: null }) : null)
  return {
    id: movement.id,
    type: movement.kind,
    typeLabel: TYPE_LABELS[movement.kind],
    direction: movement.direction,
    amount: movement.amount,
    date: movement.date,
    description: movement.description,
    category: business?.category ?? null,
    activity: business ? { id: business.id, name: business.name, status: business.status } : null,
    partner: person(movement.partnerId),
    recordedBy: person(source?.recordedBy),
    recordedAt: iso(movement.createdAt),
    period: movement.period ?? null,
    countedInBalance: movement.date <= today,
  }
}

/** Détail : la vue de liste + les champs propres à l'enregistrement d'origine (aucun champ inventé). */
export function toMovementDetail(movement, source, directories, today) {
  const view = toMovementView(movement, source, directories, today)
  const details = {}
  if (movement.kind === 'CONTRIBUTION') Object.assign(details, { period: source.period, note: source.note ?? null })
  else if (movement.kind === 'WITHDRAWAL') Object.assign(details, { reason: source.reason ?? null })
  else Object.assign(details, { receipt: source.receipt ? { reference: source.receipt.reference ?? null, url: source.receipt.url ?? null } : null })
  return {
    ...view,
    signedAmount: signed(movement),
    updatedAt: iso(source.updatedAt),
    origin: { collection: SOURCE_BY_TYPE[movement.kind], id: movement.id },
    details,
  }
}

const haystackOf = (view) => toNameKey([view.description, view.typeLabel, view.category, view.activity?.name, view.partner?.name, view.recordedBy?.name].filter(Boolean).join(' '))

const COMPARATORS = {
  date_desc: (a, b) => b.date.localeCompare(a.date) || String(b.recordedAt ?? '').localeCompare(String(a.recordedAt ?? '')) || b.id.localeCompare(a.id),
  date_asc: (a, b) => a.date.localeCompare(b.date) || String(a.recordedAt ?? '').localeCompare(String(b.recordedAt ?? '')) || a.id.localeCompare(b.id),
  amount_desc: (a, b) => b.amount - a.amount || COMPARATORS.date_desc(a, b),
  amount_asc: (a, b) => a.amount - b.amount || COMPARATORS.date_desc(a, b),
}

export function listMovements(sources, directories, query, today) {
  const { realized } = splitByToday(buildMovements(sources), today)
  const indexed = indexSources(sources)
  const views = realized.map((movement) => toMovementView(movement, indexed[SOURCE_BY_TYPE[movement.kind]].get(movement.id), directories, today))

  const categories = [...new Set(views.map((view) => view.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'))
  const searchKey = query.search ? toNameKey(query.search) : ''
  const categoryKey = query.category ? toNameKey(query.category) : ''
  const filtered = views.filter(
    (view) =>
      (!query.type || view.type === query.type) &&
      (!query.direction || view.direction === query.direction) &&
      (!categoryKey || toNameKey(view.category) === categoryKey) &&
      (!query.partnerId || view.partner?.id === query.partnerId) &&
      (!query.activityId || (query.activityId === NO_ACTIVITY ? view.activity == null : view.activity?.id === query.activityId)) &&
      (!query.from || view.date >= query.from) &&
      (!query.to || view.date <= query.to) &&
      (!searchKey || haystackOf(view).includes(searchKey)),
  )
  filtered.sort(COMPARATORS[query.sort ?? 'date_desc'])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize))
  const page = Math.min(query.page, totalPages)
  const inflow = sum(filtered.filter((view) => view.direction === 'IN'))
  const outflow = sum(filtered.filter((view) => view.direction === 'OUT'))
  return {
    movements: filtered.slice((page - 1) * query.pageSize, page * query.pageSize),
    meta: { page, pageSize: query.pageSize, total, totalPages, categories, filtered: { count: total, inflow, outflow, net: inflow - outflow } },
  }
}

/** Retrouve un mouvement (même futur) par son type et l'identifiant de son enregistrement d'origine. */
export function findMovementDetail(sources, directories, type, id, today) {
  const movement = buildMovements(sources).find((item) => item.kind === type && item.id === id)
  if (!movement) return null
  const source = indexSources(sources)[SOURCE_BY_TYPE[type]].get(id)
  return toMovementDetail(movement, source, directories, today)
}
