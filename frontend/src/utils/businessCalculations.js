// Tous les calculs du module Business (fonctions pures, sans React ni montant codé en dur).
//
// Formules :
//   total investi      = investissement initial + investissements supplémentaires
//   total des dépenses = somme des dépenses
//   total des recettes = somme des recettes
//   résultat           = recettes − dépenses − total investi
// La trésorerie (argent réellement disponible) n'est PAS le bénéfice :
//   trésorerie         = total investi + recettes − dépenses
// Aucun bénéfice n'est réparti automatiquement entre les associés.

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

// Chiffres clés d'un business, à partir de ses opérations.
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

// 'profit' (bénéfice), 'loss' (perte) ou 'break-even' (équilibre) selon le résultat.
export function getResultKind(result) {
  if (result > 0) return 'profit'
  if (result < 0) return 'loss'
  return 'break-even'
}

// Ajoute à chaque business ses chiffres clés (`financials`).
export function attachFinancials(businesses, operations) {
  return businesses.map((business) => ({ ...business, financials: getBusinessFinancials(business, operations) }))
}

// Totaux de tous les business (les opérations d'un business supprimé ne comptent pas).
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

// Filtre des business (déjà associés à leurs chiffres) par texte, catégorie et statut.
// `categoryLabels` : { valeur: libellé } ; `associateNames` : { id: nom }.
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

// Opérations d'un business, filtrées par type (« » = tous) et triées par date (récentes d'abord).
export function listBusinessOperations(operations, businessId, type = '') {
  return getBusinessOperations(operations, businessId)
    .filter((operation) => !type || operation.type === type)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
}

// Date de la plus ancienne opération d'un business (« » s'il n'y en a pas).
export function getEarliestOperationDate(operations, businessId) {
  const dates = getBusinessOperations(operations, businessId)
    .map((operation) => operation.date)
    .sort()
  return dates[0] ?? ''
}
