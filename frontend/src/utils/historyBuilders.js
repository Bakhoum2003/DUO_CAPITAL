import { EXPENSE_CATEGORIES, getAssociate } from '../constants/businessSettings'
import { HISTORY_TYPES } from '../constants/historySettings'
import { getBusinessFinancials, getBusinessOperations } from './businessCalculations'

const EXPENSE_CATEGORY_LABELS = Object.fromEntries(EXPENSE_CATEGORIES.map((category) => [category.value, category.label]))

function createEntry({ id, type, amount, date, description, business = null, associateId = '', details = {} }) {
  return {
    id,
    type,
    direction: HISTORY_TYPES[type].direction,
    amount,
    date,
    description,
    businessId: business?.id ?? '',
    businessName: business?.name ?? '',
    associateId,
    associateName: getAssociate(associateId)?.name ?? '',
    details: { sourceLabel: HISTORY_TYPES[type].sourceLabel, ...details },
  }
}

/**
 * Assemble toutes les entrées de l'Historique à partir des données des modules.
 *
 * - cotisation : entrée d'argent
 * - investissement initial de chaque business + investissements supplémentaires : sorties
 * - dépenses : sorties ; recettes : entrées ; retraits : sorties
 * - bénéfice : une entrée « résultat calculé » par business terminé (sens 'none', jamais comptée en entrée)
 *
 * @param contributions cotisations { id, associateId, amount, date, description }
 * @param businesses business { id, name, launchDate, initialInvestment, responsibleId, status… }
 * @param operations opérations des business { id, businessId, type, amount, date, associateId, expenseCategory, description }
 * @param withdrawals retraits { id, associateId, amount, date, description }
 */
export function buildHistoryEntries({ contributions, businesses, operations, withdrawals }) {
  const businessesById = new Map(businesses.map((business) => [business.id, business]))
  const entries = []

  contributions.forEach((contribution) => {
    entries.push(
      createEntry({
        id: `history-${contribution.id}`,
        type: 'contribution',
        amount: contribution.amount,
        date: contribution.date,
        description: contribution.description || 'Cotisation mensuelle',
        associateId: contribution.associateId,
      }),
    )
  })

  businesses.forEach((business) => {
    entries.push(
      createEntry({
        id: `history-${business.id}-initial`,
        type: 'investment',
        amount: business.initialInvestment,
        date: business.launchDate,
        description: 'Investissement initial',
        business,
        associateId: business.responsibleId,
        details: { isInitialInvestment: true },
      }),
    )
  })

  operations.forEach((operation) => {
    const business = businessesById.get(operation.businessId)
    if (!business) return

    entries.push(
      createEntry({
        id: `history-${operation.id}`,
        type: operation.type,
        amount: operation.amount,
        date: operation.date,
        description: operation.description || HISTORY_TYPES[operation.type].label,
        business,
        associateId: operation.associateId,
        details: operation.type === 'expense' ? { categoryLabel: EXPENSE_CATEGORY_LABELS[operation.expenseCategory] ?? '' } : {},
      }),
    )
  })

  withdrawals.forEach((withdrawal) => {
    entries.push(
      createEntry({
        id: `history-${withdrawal.id}`,
        type: 'withdrawal',
        amount: withdrawal.amount,
        date: withdrawal.date,
        description: withdrawal.description,
        associateId: withdrawal.associateId,
      }),
    )
  })

  businesses
    .filter((business) => business.status === 'completed')
    .forEach((business) => {
      const financials = getBusinessFinancials(business, operations)
      const lastOperationDate = getBusinessOperations(operations, business.id)
        .map((operation) => operation.date)
        .sort()
        .pop()

      entries.push(
        createEntry({
          id: `history-${business.id}-profit`,
          type: 'profit',
          amount: Math.abs(financials.result),
          date: lastOperationDate ?? business.launchDate,
          description: `Résultat final de « ${business.name} »`,
          business,
          associateId: '',
          details: { result: financials.result, financials },
        }),
      )
    })

  return entries
}
