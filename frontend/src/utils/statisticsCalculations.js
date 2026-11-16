// Solde net des mouvements = entrées réelles − sorties réelles (donc, avec les retraits :
//   solde net = cotisations + résultat commercial − retraits)

import { UNCATEGORIZED_EXPENSE_LABEL } from '../constants/statisticsSettings'
import { getResultKind } from './businessCalculations'
import { shiftMonthKey } from './contributionCalculations'
import { formatMonthLabel, formatShortDate } from './formatters'
import { filterHistoryEntries, getNetBalance } from './historyCalculations'


function parseIso(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function toIso(date) {
  return date.toISOString().slice(0, 10)
}

export function addDays(isoDate, days) {
  const date = parseIso(isoDate)
  date.setUTCDate(date.getUTCDate() + days)
  return toIso(date)
}

export function addMonths(isoDate, months) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const target = new Date(Date.UTC(year, month - 1 + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return toIso(target)
}

export function diffDays(startIso, endIso) {
  return Math.round((parseIso(endIso) - parseIso(startIso)) / 86400000)
}


/**
 * Bornes (incluses) d'une période. « » signifie « sans limite ».
 * @param periodKey 'week' | 'month' | '3months' | '6months' | 'year' | 'all' | 'custom'
 * @param todayIso date du jour
 */
export function getPeriodRange({ periodKey, customStartDate = '', customEndDate = '', todayIso }) {
  switch (periodKey) {
    case 'week': {
      const daysSinceMonday = (parseIso(todayIso).getUTCDay() + 6) % 7
      return { startDate: addDays(todayIso, -daysSinceMonday), endDate: todayIso }
    }
    case 'month':
      return { startDate: `${todayIso.slice(0, 8)}01`, endDate: todayIso }
    case '3months':
      return { startDate: addDays(addMonths(todayIso, -3), 1), endDate: todayIso }
    case '6months':
      return { startDate: addDays(addMonths(todayIso, -6), 1), endDate: todayIso }
    case 'year':
      return { startDate: `${todayIso.slice(0, 4)}-01-01`, endDate: todayIso }
    case 'custom':
      return { startDate: customStartDate, endDate: customEndDate }
    default:
      return { startDate: '', endDate: '' }
  }
}

export function getPreviousPeriodRange({ periodKey, range }) {
  const { startDate, endDate } = range
  if (periodKey === 'all' || !startDate || !endDate || startDate > endDate) return null

  if (periodKey === 'week') return { startDate: addDays(startDate, -7), endDate: addDays(endDate, -7) }
  if (periodKey === 'month') return { startDate: addMonths(startDate, -1), endDate: addMonths(endDate, -1) }
  if (periodKey === 'year') return { startDate: addMonths(startDate, -12), endDate: addMonths(endDate, -12) }

  const length = diffDays(startDate, endDate) + 1
  const previousEnd = addDays(startDate, -1)
  return { startDate: addDays(previousEnd, -(length - 1)), endDate: previousEnd }
}

export function getPeriodLabel({ startDate, endDate }) {
  if (startDate && endDate) return `Du ${formatShortDate(startDate)} au ${formatShortDate(endDate)}`
  if (startDate) return `Depuis le ${formatShortDate(startDate)}`
  if (endDate) return `Jusqu'au ${formatShortDate(endDate)}`
  return 'Toute la période'
}

export function filterEntriesByRange(entries, { startDate, endDate }) {
  return filterHistoryEntries(entries, {
    search: '',
    type: '',
    associateId: '',
    businessId: '',
    startDate,
    endDate,
  })
}


function sumByType(entries, type) {
  return entries.filter((entry) => entry.type === type).reduce((total, entry) => total + entry.amount, 0)
}

export const EMPTY_TOTALS = {
  contributions: 0,
  investments: 0,
  expenses: 0,
  revenues: 0,
  withdrawals: 0,
  commercialResult: 0,
  netBalance: 0,
}

export function getStatisticsTotals(entries) {
  const investments = sumByType(entries, 'investment')
  const expenses = sumByType(entries, 'expense')
  const revenues = sumByType(entries, 'revenue')

  return {
    contributions: sumByType(entries, 'contribution'),
    investments,
    expenses,
    revenues,
    withdrawals: sumByType(entries, 'withdrawal'),
    commercialResult: revenues - expenses - investments,
    netBalance: getNetBalance(entries),
  }
}

export function getVariation(current, previous) {
  if (previous === 0) return { percent: null, trend: current === 0 ? 'flat' : 'new' }

  const percent = Math.round(((current - previous) / Math.abs(previous)) * 100)
  return { percent, trend: percent > 0 ? 'up' : percent < 0 ? 'down' : 'flat' }
}

export function compareTotals(currentTotals, previousTotals) {
  return Object.fromEntries(
    Object.keys(EMPTY_TOTALS).map((key) => [key, previousTotals ? getVariation(currentTotals[key], previousTotals[key]) : null]),
  )
}

export function getProgressPercent(amount, target) {
  return target > 0 ? Math.round((amount / target) * 100) : 0
}


export function getRangeMonthKeys(range, allEntries, todayIso) {
  const dates = allEntries.map((entry) => entry.date).sort()
  if (dates.length === 0) return []

  const first = dates[0]
  const last = dates[dates.length - 1]
  const cap = last > todayIso ? last : todayIso
  const start = range.startDate && range.startDate > first ? range.startDate : first
  const end = range.endDate && range.endDate < cap ? range.endDate : cap
  if (start > end) return []

  const monthKeys = []
  for (let key = start.slice(0, 7); key <= end.slice(0, 7); key = shiftMonthKey(key, 1)) monthKeys.push(key)
  return monthKeys
}

function formatShortMonth(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' }).format(new Date(year, month - 1, 1))
}

export function groupEntriesByMonth(entries, monthKeys) {
  return monthKeys.map((monthKey) => {
    const monthEntries = entries.filter((entry) => entry.date.startsWith(monthKey))
    return {
      monthKey,
      label: formatMonthLabel(monthKey),
      shortLabel: formatShortMonth(monthKey),
      contributions: sumByType(monthEntries, 'contribution'),
      investments: sumByType(monthEntries, 'investment'),
      expenses: sumByType(monthEntries, 'expense'),
      revenues: sumByType(monthEntries, 'revenue'),
    }
  })
}


export function getExpenseBreakdown(entries) {
  const expenses = entries.filter((entry) => entry.type === 'expense')
  const total = expenses.reduce((sum, entry) => sum + entry.amount, 0)
  const byCategory = new Map()

  expenses.forEach((entry) => {
    const label = entry.details?.categoryLabel || UNCATEGORIZED_EXPENSE_LABEL
    byCategory.set(label, (byCategory.get(label) ?? 0) + entry.amount)
  })

  return [...byCategory.entries()]
    .map(([label, amount]) => ({ label, amount, percent: getProgressPercent(amount, total) }))
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label, 'fr'))
}


export function getBusinessPerformance(entries, businesses) {
  const totals = new Map()

  entries
    .filter((entry) => entry.businessId && entry.direction !== 'none')
    .forEach((entry) => {
      const current = totals.get(entry.businessId) ?? { invested: 0, expenses: 0, revenues: 0 }
      if (entry.type === 'investment') current.invested += entry.amount
      if (entry.type === 'expense') current.expenses += entry.amount
      if (entry.type === 'revenue') current.revenues += entry.amount
      totals.set(entry.businessId, current)
    })

  return businesses
    .filter((business) => totals.has(business.id))
    .map((business) => {
      const { invested, expenses, revenues } = totals.get(business.id)
      const result = revenues - expenses - invested
      return { businessId: business.id, name: business.name, status: business.status, invested, expenses, revenues, result, kind: getResultKind(result) }
    })
    .sort((a, b) => b.result - a.result || a.name.localeCompare(b.name, 'fr'))
}

export function getActivityAssessment(item) {
  if (item.status !== 'completed') return { label: 'Résultat provisoire', tone: 'info', isProvisional: true }
  if (item.kind === 'profit') return { label: 'Rentable', tone: 'success', isProvisional: false }
  if (item.kind === 'loss') return { label: 'Déficitaire', tone: 'danger', isProvisional: false }
  return { label: "À l'équilibre", tone: 'warning', isProvisional: false }
}

export function getActivitySummary(performance) {
  const best = performance[0] ?? null
  const worst = performance.length > 1 ? performance[performance.length - 1] : null

  return {
    total: performance.length,
    ongoing: performance.filter((item) => item.status !== 'completed').length,
    completed: performance.filter((item) => item.status === 'completed').length,
    best,
    worst,
  }
}


/**
 * Total cotisé par chaque associé, objectif sur la période (objectif mensuel × nombre de mois) et progression.
 * Aucun classement : les associés restent dans l'ordre fourni.
 * @param associates [{ id, name, initials, avatarTone }]
 */
export function getAssociateContributionStats({ entries, associates, monthCount, monthlyTarget }) {
  const target = monthlyTarget * monthCount

  return associates.map((associate) => {
    const own = entries.filter((entry) => entry.type === 'contribution' && entry.associateId === associate.id)
    const total = own.reduce((sum, entry) => sum + entry.amount, 0)
    return {
      associate,
      total,
      count: own.length,
      target,
      percent: getProgressPercent(total, target),
      remaining: Math.max(0, target - total),
      isComplete: target > 0 && total >= target,
    }
  })
}

export function getMonthlyContributionsByAssociate(entries, monthKeys, associates) {
  return monthKeys.map((monthKey) => {
    const row = { monthKey, label: formatMonthLabel(monthKey), shortLabel: formatShortMonth(monthKey) }
    associates.forEach((associate) => {
      row[associate.id] = entries
        .filter((entry) => entry.type === 'contribution' && entry.associateId === associate.id && entry.date.startsWith(monthKey))
        .reduce((sum, entry) => sum + entry.amount, 0)
    })
    return row
  })
}
