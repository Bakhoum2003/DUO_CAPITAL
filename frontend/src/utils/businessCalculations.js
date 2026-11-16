
import { normalizeSearchText } from './contributionCalculations'
import { formatNumber, formatShortDate } from './formatters'

export function sumAmounts(operations) {
  return operations.reduce((total, operation) => total + operation.amount, 0)
}

export function getBusinessOperations(operations, businessId) {
  return operations.filter((operation) => operation.businessId === businessId)
}

function sumByType(operations, type) {
  return sumAmounts(operations.filter((operation) => operation.type === type))
}

export function getBusinessFinancials(business, operations) {
  const businessOperations = getBusinessOperations(operations, business.id)
  const additionalInvestments = sumByType(businessOperations, 'investment')
  const totalInvested = business.initialInvestment + additionalInvestments
  const totalExpenses = sumByType(businessOperations, 'expense')
  const totalRevenues = sumByType(businessOperations, 'revenue')

  return {
    initialInvestment: business.initialInvestment,
    additionalInvestments,
    totalInvested,
    totalExpenses,
    totalRevenues,
    result: totalRevenues - totalExpenses - totalInvested,
    cashBalance: totalInvested + totalRevenues - totalExpenses,
    operationCount: businessOperations.length,
  }
}

export function getResultKind(result) {
  if (result > 0) return 'profit'
  if (result < 0) return 'loss'
  return 'break-even'
}

export function attachFinancials(businesses, operations) {
  return businesses.map((business) => ({ ...business, financials: getBusinessFinancials(business, operations) }))
}

export function getGlobalTotals(businesses, operations) {
  const allFinancials = businesses.map((business) => getBusinessFinancials(business, operations))
  const sum = (key) => allFinancials.reduce((total, financials) => total + financials[key], 0)

  return {
    businessCount: businesses.length,
    totalInvested: sum('totalInvested'),
    totalExpenses: sum('totalExpenses'),
    totalRevenues: sum('totalRevenues'),
    result: sum('result'),
  }
}

export function filterBusinesses(businesses, { search, category, status }, categoryLabels, associateNames) {
  const query = normalizeSearchText(search)

  return businesses.filter((business) => {
    if (category && business.category !== category) return false
    if (status && business.status !== status) return false
    if (!query) return true

    const searchableText = normalizeSearchText(
      [
        business.name,
        categoryLabels[business.category] ?? '',
        business.description,
        associateNames[business.responsibleId] ?? '',
        formatShortDate(business.launchDate),
        formatNumber(business.initialInvestment),
      ].join(' '),
    )
    return searchableText.includes(query)
  })
}

// Tri : 'date-desc' / 'date-asc' (date de lancement) ou 'result-desc' / 'result-asc' (résultat financier).
export function sortBusinesses(businesses, sortOrder) {
  const compare = {
    'date-desc': (a, b) => b.launchDate.localeCompare(a.launchDate),
    'date-asc': (a, b) => a.launchDate.localeCompare(b.launchDate),
    'result-desc': (a, b) => b.financials.result - a.financials.result,
    'result-asc': (a, b) => a.financials.result - b.financials.result,
  }[sortOrder]

  return [...businesses].sort((a, b) => compare(a, b) || a.id.localeCompare(b.id))
}

export function listBusinessOperations(operations, businessId, type = '') {
  return getBusinessOperations(operations, businessId)
    .filter((operation) => !type || operation.type === type)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
}

export function getEarliestOperationDate(operations, businessId) {
  const dates = getBusinessOperations(operations, businessId)
    .map((operation) => operation.date)
    .sort()
  return dates[0] ?? ''
}
