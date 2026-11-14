import { describe, expect, it } from 'vitest'
import { MOCK_BUSINESSES, MOCK_OPERATIONS } from '../src/data/businessMockData'
import {
  attachFinancials,
  filterBusinesses,
  getBusinessFinancials,
  getEarliestOperationDate,
  getGlobalTotals,
  getResultKind,
  listBusinessOperations,
  sortBusinesses,
} from '../src/utils/businessCalculations'

const business = { id: 'b1', name: 'Test', category: 'drinks', description: '', launchDate: '2026-01-01', initialInvestment: 10000, responsibleId: '', status: 'ongoing' }
const op = (id, type, amount, businessId = 'b1', date = '2026-02-01') => ({ id, businessId, type, amount, date, associateId: 'mohamed-bakhoum', expenseCategory: '', description: '' })

describe('getBusinessFinancials', () => {
  it('applique les formules du cahier des charges', () => {
    const operations = [op('1', 'investment', 5000), op('2', 'expense', 3000), op('3', 'expense', 2000), op('4', 'revenue', 30000), op('5', 'revenue', 1000, 'autre')]
    const financials = getBusinessFinancials(business, operations)
    expect(financials.initialInvestment).toBe(10000)
    expect(financials.additionalInvestments).toBe(5000)
    expect(financials.totalInvested).toBe(15000)
    expect(financials.totalExpenses).toBe(5000)
    expect(financials.totalRevenues).toBe(30000)
    expect(financials.result).toBe(30000 - 5000 - 15000)
    expect(financials.operationCount).toBe(4)
  })

  it('distingue la trésorerie du bénéfice', () => {
    const financials = getBusinessFinancials(business, [op('1', 'expense', 4000), op('2', 'revenue', 9000)])
    expect(financials.result).toBe(9000 - 4000 - 10000)
    expect(financials.cashBalance).toBe(10000 + 9000 - 4000)
  })

  it('sans opération : le résultat est l\'opposé de l\'investissement initial', () => {
    const financials = getBusinessFinancials(business, [])
    expect(financials.result).toBe(-10000)
    expect(financials.totalExpenses).toBe(0)
    expect(financials.totalRevenues).toBe(0)
  })
})

describe('getResultKind', () => {
  it('reconnaît bénéfice, perte et équilibre', () => {
    expect(getResultKind(1)).toBe('profit')
    expect(getResultKind(-1)).toBe('loss')
    expect(getResultKind(0)).toBe('break-even')
  })
})

describe('getGlobalTotals', () => {
  it('additionne tous les business et ignore les opérations orphelines', () => {
    const second = { ...business, id: 'b2', initialInvestment: 20000 }
    const operations = [op('1', 'revenue', 50000), op('2', 'expense', 5000, 'b2'), op('3', 'revenue', 99999, 'supprime')]
    const totals = getGlobalTotals([business, second], operations)
    expect(totals.businessCount).toBe(2)
    expect(totals.totalInvested).toBe(30000)
    expect(totals.totalExpenses).toBe(5000)
    expect(totals.totalRevenues).toBe(50000)
    expect(totals.result).toBe(50000 - 5000 - 30000)
  })

  it('totaux nuls sans business', () => {
    expect(getGlobalTotals([], [])).toEqual({ businessCount: 0, totalInvested: 0, totalExpenses: 0, totalRevenues: 0, result: 0 })
  })

  it('données de démonstration : chiffres attendus', () => {
    const results = Object.fromEntries(MOCK_BUSINESSES.map((item) => [item.id, getBusinessFinancials(item, MOCK_OPERATIONS).result]))
    expect(results).toEqual({ 'business-001': 10000, 'business-002': 27000, 'business-003': -2000, 'business-004': -41000, 'business-005': -30000 })
    const totals = getGlobalTotals(MOCK_BUSINESSES, MOCK_OPERATIONS)
    expect(totals.totalInvested).toBe(50000 + 45000 + 35000 + 75000 + 25000)
    expect(totals.totalRevenues).toBe(80000 + 107000 + 57000 + 75000)
    expect(totals.totalExpenses).toBe(20000 + 35000 + 24000 + 41000 + 5000)
    expect(totals.result).toBe(10000 + 27000 - 2000 - 41000 - 30000)
  })
})

describe('filtres et tris', () => {
  const list = attachFinancials(MOCK_BUSINESSES, MOCK_OPERATIONS)
  const labels = { drinks: 'Boissons', clothing: 'Vêtements', food: 'Nourriture', school: 'Fournitures scolaires', other: 'Autre activité' }
  const names = { 'mohamed-bakhoum': 'Mohamed Bakhoum', 'cheikh-sow': 'Cheikh Sow' }
  const empty = { search: '', category: '', status: '' }

  it('filtre par catégorie et par statut', () => {
    expect(filterBusinesses(list, { ...empty, category: 'drinks' }, labels, names)).toHaveLength(1)
    expect(filterBusinesses(list, { ...empty, status: 'completed' }, labels, names)).toHaveLength(2)
    expect(filterBusinesses(list, { ...empty, status: 'ongoing', category: 'school' }, labels, names)).toHaveLength(1)
  })

  it('recherche sans tenir compte des accents ni de la casse', () => {
    expect(filterBusinesses(list, { ...empty, search: 'VETEMENTS' }, labels, names)).toHaveLength(1)
    expect(filterBusinesses(list, { ...empty, search: 'cheikh' }, labels, names)).toHaveLength(2)
    expect(filterBusinesses(list, { ...empty, search: 'zzz' }, labels, names)).toHaveLength(0)
  })

  it('trie par date de lancement et par résultat', () => {
    expect(sortBusinesses(list, 'date-desc')[0].id).toBe('business-005')
    expect(sortBusinesses(list, 'date-asc')[0].id).toBe('business-003')
    expect(sortBusinesses(list, 'result-desc')[0].id).toBe('business-002')
    expect(sortBusinesses(list, 'result-asc')[0].id).toBe('business-004')
  })
})

describe('opérations', () => {
  it('liste les opérations d\'un business, filtrées par type, récentes d\'abord', () => {
    const all = listBusinessOperations(MOCK_OPERATIONS, 'business-001')
    expect(all.map((item) => item.id)).toEqual(['operation-005', 'operation-004', 'operation-003', 'operation-002', 'operation-001'])
    expect(listBusinessOperations(MOCK_OPERATIONS, 'business-001', 'revenue')).toHaveLength(2)
  })

  it('trouve la première opération', () => {
    expect(getEarliestOperationDate(MOCK_OPERATIONS, 'business-001')).toBe('2026-09-06')
    expect(getEarliestOperationDate([], 'x')).toBe('')
  })
})
