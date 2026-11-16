// Solde net         = entrées − sorties
// Le solde net n'est pas le bénéfice commercial, et aucune répartition entre associés n'est calculée.

import { HISTORY_TYPES, NO_BUSINESS_FILTER } from '../constants/historySettings'
import { normalizeSearchText } from './contributionCalculations'
import { formatNumber, formatShortDate } from './formatters'

function sumByDirection(entries, direction) {
  return entries.filter((entry) => entry.direction === direction).reduce((total, entry) => total + entry.amount, 0)
}

export function getTotalIn(entries) {
  return sumByDirection(entries, 'in')
}

export function getTotalOut(entries) {
  return sumByDirection(entries, 'out')
}

export function getNetBalance(entries) {
  return getTotalIn(entries) - getTotalOut(entries)
}

export function getHistoryTotals(entries) {
  const totalIn = getTotalIn(entries)
  const totalOut = getTotalOut(entries)

  return {
    totalIn,
    totalOut,
    netBalance: totalIn - totalOut,
    movementCount: entries.filter((entry) => entry.direction !== 'none').length,
    entryCount: entries.length,
  }
}

export function getPeriodError(startDate, endDate) {
  if (startDate && endDate && startDate > endDate) {
    return 'La date de début doit être antérieure ou égale à la date de fin.'
  }
  return ''
}

/**
 * Filtre les entrées ; tous les critères se combinent (ET).
 * @param filters { search, type, associateId, businessId, startDate, endDate } (« » = pas de filtre)
 */
export function filterHistoryEntries(entries, { search, type, associateId, businessId, startDate, endDate }) {
  const query = normalizeSearchText(search)

  return entries.filter((entry) => {
    if (type && entry.type !== type) return false
    if (associateId && entry.associateId !== associateId) return false
    if (businessId === NO_BUSINESS_FILTER && entry.businessId) return false
    if (businessId && businessId !== NO_BUSINESS_FILTER && entry.businessId !== businessId) return false
    if (startDate && entry.date < startDate) return false
    if (endDate && entry.date > endDate) return false
    if (!query) return true

    const searchableText = normalizeSearchText(
      [
        entry.description,
        HISTORY_TYPES[entry.type].label,
        entry.businessName,
        entry.associateName,
        entry.amount,
        formatNumber(entry.amount),
        formatShortDate(entry.date),
      ].join(' '),
    )
    return searchableText.includes(query)
  })
}

export function sortHistoryEntries(entries, sortOrder) {
  const direction = sortOrder === 'date-asc' ? 1 : -1
  return [...entries].sort((a, b) => direction * (a.date.localeCompare(b.date) || a.id.localeCompare(b.id)))
}

export function getBusinessOptions(entries) {
  const names = new Map()
  entries.forEach((entry) => {
    if (entry.businessId) names.set(entry.businessId, entry.businessName)
  })
  return [...names.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}
