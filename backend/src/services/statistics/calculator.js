// Calculs du module Statistiques : fonctions PURES (aucune base de données, aucune horloge, aucun effet de bord).
//
// Aucun second système de calcul : les mouvements viennent de `normalizeMovements` (calculateur du Dashboard, aussi base
// de la Trésorerie et de l'Historique). Règles (décisions validées) :
// - un enregistrement non supprimé = une opération réelle (les modèles n'ont pas de statut « annulé ») ;
// - une opération datée APRÈS aujourd'hui (Africa/Dakar) n'est jamais comptée (elle est seulement signalée) ;
// - entrées = cotisations + recettes ; sorties = investissements + dépenses + retraits ; solde net = entrées − sorties ;
// - résultat commercial = recettes − dépenses − investissements (≠ résultat d'exploitation du Dashboard, qui exclut les
//   investissements) : c'est un calcul, JAMAIS ajouté aux entrées ; les cotisations et retraits n'en font pas partie ;
// - dépenses par catégorie : catégorie réelle de l'activité (« Non catégorisé » sinon, identifiant null) ;
// - comparaison des associés : mois = mois CONCERNÉ (`period`) ; objectif mensuel à partir de FUND_START_PERIOD seulement ;
//   les montants cotisés ne sont jamais plafonnés, seul le pourcentage d'atteinte l'est (100 %).

import { monthOf, monthsBetween } from '../../utils/businessDates.js'
import { normalizeMovements } from '../dashboard/calculator.js'

export const UNCATEGORIZED_LABEL = 'Non catégorisé'
const UNKNOWN_ACTIVITY_LABEL = 'Activité inconnue'
const idOf = (value) => (value == null ? null : String(value))
const sum = (list, pick = (item) => item.amount) => list.reduce((total, item) => total + pick(item), 0)
const percentOf = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0)
const byAmountDesc = (a, b) => b.amount - a.amount || String(a.label).localeCompare(String(b.label), 'fr')

const inRange = (movement, range) => range != null && (range.from == null || movement.date >= range.from) && movement.date <= range.to && (range.from == null || range.from <= range.to)

/** Totaux d'un ensemble de mouvements déjà réalisés. */
export function totalsOf(movements) {
  const of = (kind) => movements.filter((movement) => movement.kind === kind)
  const total = (kind) => ({ amount: sum(of(kind)), count: of(kind).length })
  const contributions = total('CONTRIBUTION')
  const revenues = total('REVENUE')
  const investments = total('INVESTMENT')
  const expenses = total('EXPENSE')
  const withdrawals = total('WITHDRAWAL')
  const inflow = contributions.amount + revenues.amount
  const outflow = investments.amount + expenses.amount + withdrawals.amount
  return {
    contributions,
    revenues,
    investments,
    expenses,
    withdrawals,
    inflow,
    outflow,
    commercialResult: revenues.amount - expenses.amount - investments.amount,
    netBalance: inflow - outflow,
    operationsCount: movements.length,
  }
}

const flatTotals = (totals) => ({
  contributions: totals.contributions.amount,
  investments: totals.investments.amount,
  expenses: totals.expenses.amount,
  revenues: totals.revenues.amount,
  withdrawals: totals.withdrawals.amount,
  commercialResult: totals.commercialResult,
  netBalance: totals.netBalance,
})

function buildMonthly(monthKeys, movements) {
  return monthKeys.map((month) => {
    const totals = totalsOf(movements.filter((movement) => movement.date.startsWith(month)))
    return {
      month,
      contributions: totals.contributions.amount,
      revenues: totals.revenues.amount,
      investments: totals.investments.amount,
      expenses: totals.expenses.amount,
      withdrawals: totals.withdrawals.amount,
      inflow: totals.inflow,
      outflow: totals.outflow,
      commercialResult: totals.commercialResult,
      netBalance: totals.netBalance,
    }
  })
}

function buildExpensesByCategory(movements, businessById) {
  const expenses = movements.filter((movement) => movement.kind === 'EXPENSE')
  const total = sum(expenses)
  const byLabel = new Map()
  for (const movement of expenses) {
    const label = businessById.get(movement.businessId)?.category || UNCATEGORIZED_LABEL
    const entry = byLabel.get(label) ?? { id: null, label, amount: 0, count: 0 }
    entry.amount += movement.amount
    entry.count += 1
    byLabel.set(label, entry)
  }
  return [...byLabel.values()].map((entry) => ({ ...entry, percent: percentOf(entry.amount, total) })).sort(byAmountDesc)
}

function buildActivities(movements, businessById) {
  const byActivity = new Map()
  for (const movement of movements) {
    if (!movement.businessId || !['REVENUE', 'EXPENSE', 'INVESTMENT'].includes(movement.kind)) continue
    const entry = byActivity.get(movement.businessId) ?? { revenues: 0, expenses: 0, investments: 0, operationsCount: 0 }
    if (movement.kind === 'REVENUE') entry.revenues += movement.amount
    if (movement.kind === 'EXPENSE') entry.expenses += movement.amount
    if (movement.kind === 'INVESTMENT') entry.investments += movement.amount
    entry.operationsCount += 1
    byActivity.set(movement.businessId, entry)
  }
  return [...byActivity.entries()]
    .map(([id, entry]) => {
      const business = businessById.get(id)
      const status = business?.status ?? null
      return {
        id,
        name: business?.name ?? UNKNOWN_ACTIVITY_LABEL,
        status,
        category: business?.category ?? null,
        ...entry,
        result: entry.revenues - entry.expenses - entry.investments,
        // Une activité active ou suspendue peut encore recevoir des recettes : son résultat reste provisoire.
        isProvisional: status === 'ACTIVE' || status === 'SUSPENDED',
      }
    })
    .sort((a, b) => b.result - a.result || a.name.localeCompare(b.name, 'fr'))
}

function buildContributionComparison({ partners, contributions, monthKeys, today, fundStartPeriod, monthlyTarget }) {
  const currentMonth = monthOf(today)
  const monthSet = new Set(monthKeys)
  const hasObjective = (month) => fundStartPeriod != null && month >= fundStartPeriod

  const rows = partners.map((partner) => {
    const own = contributions.filter((item) => idOf(item.partner) === partner.id && item.contributionDate <= today && monthSet.has(item.period))
    const months = monthKeys.map((month) => {
      const contributed = sum(own.filter((item) => item.period === month))
      const objective = hasObjective(month)
      const target = objective ? monthlyTarget : null
      let status = 'NO_OBJECTIVE'
      if (objective) status = contributed >= target ? 'ACHIEVED' : contributed > 0 ? 'PARTIAL' : 'NOT_PAID'
      return {
        month,
        contributed, // montant réel, jamais plafonné
        target,
        percent: objective ? Math.min(100, percentOf(contributed, target)) : null,
        remaining: objective ? Math.max(0, target - contributed) : null,
        status,
        overdue: objective && contributed < target && month < currentMonth,
      }
    })
    const objectiveMonths = months.filter((row) => row.target != null)
    const target = objectiveMonths.length > 0 ? sum(objectiveMonths, (row) => row.target) : null
    const settled = sum(objectiveMonths, (row) => Math.min(row.contributed, row.target))
    let status = 'NO_OBJECTIVE'
    if (target != null) status = settled >= target ? 'ACHIEVED' : objectiveMonths.some((row) => row.overdue) ? 'LATE' : 'PENDING'
    return {
      partnerId: partner.id,
      name: partner.name,
      partnerNumber: partner.partnerNumber,
      contributed: sum(months, (row) => row.contributed),
      contributionsCount: own.length,
      target,
      settled: target == null ? null : settled,
      percent: target == null ? null : Math.min(100, percentOf(settled, target)),
      remaining: target == null ? null : target - settled,
      status,
      months,
    }
  })

  return { monthlyTarget, fundStartPeriod: fundStartPeriod ?? null, objectiveAvailable: fundStartPeriod != null, partners: rows }
}

/**
 * @param {object} input
 * @param {string} input.today « AAAA-MM-JJ » (Africa/Dakar)
 * @param {{ key: string, label: string, from: string | null, to: string, requestedTo: string, isEmpty: boolean }} input.range
 * @param {{ from: string, to: string } | null} input.previousRange
 * @param {string | null} input.fundStartPeriod « AAAA-MM » ou null
 * @param {number} input.monthlyTarget objectif mensuel par associé (FCFA)
 * @param {Array<{ id: string, name: string, partnerNumber: number }>} input.partners
 * @param {Array} input.businesses { _id, name, category, status }
 * @param {Array} input.contributions @param {Array} input.operations @param {Array} input.withdrawals enregistrements non supprimés
 */
export function computeStatistics({ today, range, previousRange = null, fundStartPeriod = null, monthlyTarget, partners, businesses, contributions, operations, withdrawals }) {
  const all = normalizeMovements({ contributions, operations, withdrawals })
  const realized = all.filter((movement) => movement.date <= today) // l'avenir n'a pas encore eu lieu
  const futureIgnored = { count: all.length - realized.length }
  const businessById = new Map(businesses.map((business) => [idOf(business._id), business]))

  const periodMovements = realized.filter((movement) => inRange(movement, range))
  const totals = totalsOf(periodMovements)

  // Mois analysés : du début de la période (ou de la première opération) jusqu'à la fin ; jamais d'avenir, jamais avant les données.
  const earliest = realized.reduce((min, movement) => (min == null || movement.date < min ? movement.date : min), null)
  const start = earliest == null ? null : range.from != null && range.from > earliest ? range.from : earliest
  const monthKeys = start == null || range.isEmpty || start > range.to ? [] : monthsBetween(monthOf(start), monthOf(range.to))

  const activities = buildActivities(periodMovements, businessById)
  const previousMovements = previousRange ? realized.filter((movement) => inRange(movement, previousRange)) : []

  const notices = [
    { code: 'COMMERCIAL_RESULT_DEFINITION', level: 'info', message: "Résultat commercial = recettes − dépenses − investissements. C'est un calcul : il n'est jamais ajouté aux entrées de trésorerie, et il diffère du résultat d'exploitation du tableau de bord (qui exclut les investissements)." },
  ]
  if (fundStartPeriod == null) {
    notices.push({ code: 'OBJECTIVE_UNAVAILABLE', level: 'info', message: "La date de début du fonds n'est pas configurée : l'objectif mensuel de cotisation ne peut pas être calculé." })
  }
  if (futureIgnored.count > 0) {
    notices.push({ code: 'FUTURE_OPERATIONS_IGNORED', level: 'info', message: `${futureIgnored.count} opération(s) datée(s) dans le futur ne sont pas comptées.` })
  }

  return {
    period: { key: range.key, label: range.label, from: range.from, to: range.to, requestedTo: range.requestedTo, isEmpty: range.isEmpty },
    totals,
    counts: {
      operations: totals.operationsCount,
      byType: { CONTRIBUTION: totals.contributions.count, REVENUE: totals.revenues.count, INVESTMENT: totals.investments.count, EXPENSE: totals.expenses.count, WITHDRAWAL: totals.withdrawals.count },
      activities: activities.length,
      months: monthKeys.length,
    },
    monthly: buildMonthly(monthKeys, periodMovements),
    expensesByCategory: buildExpensesByCategory(periodMovements, businessById),
    activities,
    contributionComparison: buildContributionComparison({ partners, contributions, monthKeys, today, fundStartPeriod, monthlyTarget }),
    previousPeriod: previousRange ? { from: previousRange.from, to: previousRange.to, hasMovements: previousMovements.length > 0, totals: flatTotals(totalsOf(previousMovements)) } : null,
    futureIgnored,
    notices,
  }
}
