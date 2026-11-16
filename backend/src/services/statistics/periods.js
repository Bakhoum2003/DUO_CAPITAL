
import { addDays, addMonths, diffDays, firstDayOfMonth, lastDayOfMonth, monthOf, startOfWeek } from '../../utils/businessDates.js'

export const STATISTICS_PERIOD_KEYS = Object.freeze(['week', 'month', 'last3months', 'last6months', 'year', 'all', 'custom'])

const PERIOD_LABELS = Object.freeze({
  week: 'Cette semaine',
  month: 'Ce mois',
  last3months: '3 derniers mois',
  last6months: '6 derniers mois',
  year: 'Cette année',
  all: 'Toute la période',
  custom: 'Période personnalisée',
})

export function addMonthsToDate(isoDate, count) {
  const period = addMonths(monthOf(isoDate), count)
  const day = Math.min(Number(isoDate.slice(8, 10)), Number(lastDayOfMonth(period).slice(8, 10)))
  return `${period}-${String(day).padStart(2, '0')}`
}

/**
 * Intervalle d'une période.
 * - week : du lundi à aujourd'hui ; month : du 1er du mois à aujourd'hui ; year : du 1er janvier à aujourd'hui ;
 * - last3months / last6months : de (aujourd'hui − 3 ou 6 mois + 1 jour) à aujourd'hui ;
 * - all : `from` = null (depuis la première opération) ; custom : dates fournies, `to` plafonné à aujourd'hui.
 * @returns {{ key: string, label: string, from: string | null, to: string, requestedTo: string, isEmpty: boolean }}
 */
export function resolveStatisticsRange({ period = 'all', from, to }, today) {
  let range
  switch (period) {
    case 'week':
      range = { from: startOfWeek(today), to: today }
      break
    case 'month':
      range = { from: firstDayOfMonth(monthOf(today)), to: today }
      break
    case 'last3months':
      range = { from: addDays(addMonthsToDate(today, -3), 1), to: today }
      break
    case 'last6months':
      range = { from: addDays(addMonthsToDate(today, -6), 1), to: today }
      break
    case 'year':
      range = { from: `${today.slice(0, 4)}-01-01`, to: today }
      break
    case 'custom':
      range = { from, to }
      break
    default:
      range = { from: null, to: today }
  }
  const effectiveTo = range.to > today ? today : range.to
  return {
    key: period,
    label: PERIOD_LABELS[period] ?? PERIOD_LABELS.all,
    from: range.from,
    to: effectiveTo,
    requestedTo: range.to,
    isEmpty: range.from != null && range.from > effectiveTo,
  }
}

export function previousPeriodRange(range) {
  if (range.key === 'all' || range.from == null || range.isEmpty) return null
  if (range.key === 'week') return { from: addDays(range.from, -7), to: addDays(range.to, -7) }
  if (range.key === 'month') return { from: addMonthsToDate(range.from, -1), to: addMonthsToDate(range.to, -1) }
  if (range.key === 'year') return { from: addMonthsToDate(range.from, -12), to: addMonthsToDate(range.to, -12) }
  const length = diffDays(range.from, range.to) + 1
  const previousTo = addDays(range.from, -1)
  return { from: addDays(previousTo, -(length - 1)), to: previousTo }
}
