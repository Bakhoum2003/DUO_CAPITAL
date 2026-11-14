// Dates métier « AAAA-MM-JJ » (sans heure ni fuseau) et périodes « AAAA-MM ».
// Tout le calcul se fait sur des chaînes et des dates UTC : aucun décalage de fuseau possible.
// Seul « aujourd'hui » dépend du fuseau métier (Africa/Dakar, UTC+0 toute l'année).

import { BUSINESS_TIME_ZONE } from '../config/constants.js'

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const PERIOD_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/

export const MAX_CUSTOM_RANGE_DAYS = 3660

export function isValidDate(value) {
  if (typeof value !== 'string') return false
  const match = DATE_PATTERN.exec(value)
  if (!match) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export const isValidPeriod = (value) => typeof value === 'string' && PERIOD_PATTERN.test(value)

const toDate = (isoDate) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}
const toIso = (date) => date.toISOString().slice(0, 10)

/** Date du jour à Dakar, « AAAA-MM-JJ ». */
export function todayInBusinessZone(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function addDays(isoDate, days) {
  const date = toDate(isoDate)
  date.setUTCDate(date.getUTCDate() + days)
  return toIso(date)
}

export function diffDays(fromDate, toDateValue) {
  return Math.round((toDate(toDateValue) - toDate(fromDate)) / 86_400_000)
}

export const monthOf = (isoDate) => isoDate.slice(0, 7)

export function addMonths(period, count) {
  const [year, month] = period.split('-').map(Number)
  const index = year * 12 + (month - 1) + count
  return `${String(Math.floor(index / 12)).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`
}

/** Mois de `first` à `last` inclus (vide si first > last). */
export function monthsBetween(first, last) {
  const months = []
  for (let month = first; month <= last; month = addMonths(month, 1)) months.push(month)
  return months
}

export function firstDayOfMonth(period) {
  return `${period}-01`
}

export function lastDayOfMonth(period) {
  const [year, month] = period.split('-').map(Number)
  return toIso(new Date(Date.UTC(year, month, 0)))
}

/** Lundi de la semaine contenant la date (semaine du lundi au dimanche). */
export function startOfWeek(isoDate) {
  const weekday = (toDate(isoDate).getUTCDay() + 6) % 7 // lundi = 0
  return addDays(isoDate, -weekday)
}

export const PERIOD_KEYS = Object.freeze(['today', 'week', 'month', 'quarter', 'year', 'all', 'custom'])

const PERIOD_LABELS = {
  today: "Aujourd'hui",
  week: 'Cette semaine',
  month: 'Ce mois',
  quarter: 'Ce trimestre',
  year: 'Cette année',
  all: 'Depuis le début',
  custom: 'Période personnalisée',
}

/**
 * Transforme un filtre (today, week, month, quarter, year, all, custom) en intervalle de dates métier.
 * `from` vaut null pour « depuis le début ». `to` peut dépasser aujourd'hui (le calcul le plafonne).
 * @returns {{ key: string, label: string, from: string | null, to: string }}
 */
export function resolvePeriodRange({ period = 'all', from, to }, today) {
  const year = today.slice(0, 4)
  const month = monthOf(today)
  let range
  switch (period) {
    case 'today':
      range = { from: today, to: today }
      break
    case 'week': {
      const monday = startOfWeek(today)
      range = { from: monday, to: addDays(monday, 6) }
      break
    }
    case 'month':
      range = { from: firstDayOfMonth(month), to: lastDayOfMonth(month) }
      break
    case 'quarter': {
      const firstMonth = Math.floor((Number(month.slice(5)) - 1) / 3) * 3 + 1
      const start = `${year}-${String(firstMonth).padStart(2, '0')}`
      range = { from: firstDayOfMonth(start), to: lastDayOfMonth(addMonths(start, 2)) }
      break
    }
    case 'year':
      range = { from: `${year}-01-01`, to: `${year}-12-31` }
      break
    case 'custom':
      range = { from, to }
      break
    default:
      range = { from: null, to: today }
  }
  return { key: period, label: PERIOD_LABELS[period] ?? PERIOD_LABELS.all, ...range }
}
