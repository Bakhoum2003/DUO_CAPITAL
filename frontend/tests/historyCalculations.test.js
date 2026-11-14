import { describe, expect, it } from 'vitest'
import { MOCK_BUSINESSES, MOCK_OPERATIONS } from '../src/data/businessMockData'
import { contributionsMockData as MOCK_CONTRIBUTIONS } from '../src/data/contributionsMockData'
import { MOCK_WITHDRAWALS } from '../src/data/historyMockData'
import { NO_BUSINESS_FILTER } from '../src/constants/historySettings'
import { buildHistoryEntries } from '../src/utils/historyBuilders'
import {
  filterHistoryEntries,
  getBusinessOptions,
  getHistoryTotals,
  getNetBalance,
  getPeriodError,
  getTotalIn,
  getTotalOut,
  sortHistoryEntries,
} from '../src/utils/historyCalculations'

const entry = (id, type, direction, amount, date, extra = {}) => ({
  id, type, direction, amount, date, description: `Mouvement ${id}`, businessId: '', businessName: '', associateId: '', associateName: '', details: {}, ...extra,
})
const noFilter = { search: '', type: '', associateId: '', businessId: '', startDate: '', endDate: '' }

describe('totaux', () => {
  const entries = [
    entry('1', 'contribution', 'in', 15000, '2026-01-05'),
    entry('2', 'revenue', 'in', 40000, '2026-01-10'),
    entry('3', 'investment', 'out', 10000, '2026-01-11'),
    entry('4', 'expense', 'out', 3000, '2026-01-12'),
    entry('5', 'withdrawal', 'out', 2000, '2026-01-13'),
    entry('6', 'profit', 'none', 25000, '2026-01-14'),
  ]

  it('entrées = cotisations + recettes', () => {
    expect(getTotalIn(entries)).toBe(55000)
  })

  it('sorties = investissements + dépenses + retraits', () => {
    expect(getTotalOut(entries)).toBe(15000)
  })

  it('solde net = entrées − sorties', () => {
    expect(getNetBalance(entries)).toBe(40000)
  })

  it('un bénéfice calculé n\'est jamais compté (pas de double comptage)', () => {
    const totals = getHistoryTotals(entries)
    expect(totals.totalIn).toBe(55000)
    expect(totals.totalOut).toBe(15000)
    expect(totals.movementCount).toBe(5)
    expect(totals.entryCount).toBe(6)
  })

  it('totaux nuls sans entrée', () => {
    expect(getHistoryTotals([])).toEqual({ totalIn: 0, totalOut: 0, netBalance: 0, movementCount: 0, entryCount: 0 })
  })

  it('un solde net peut être négatif', () => {
    expect(getNetBalance([entry('1', 'expense', 'out', 5000, '2026-01-01')])).toBe(-5000)
  })
})

describe('données de démonstration assemblées', () => {
  const entries = buildHistoryEntries({
    contributions: MOCK_CONTRIBUTIONS,
    businesses: MOCK_BUSINESSES,
    operations: MOCK_OPERATIONS,
    withdrawals: MOCK_WITHDRAWALS,
  })
  const totals = getHistoryTotals(entries)

  it('contient les six catégories de mouvements', () => {
    const types = new Set(entries.map((item) => item.type))
    expect([...types].sort()).toEqual(['contribution', 'expense', 'investment', 'profit', 'revenue', 'withdrawal'])
  })

  it('entrées : 360 000 de cotisations + 319 000 de recettes', () => {
    expect(totals.totalIn).toBe(360000 + 319000)
  })

  it('sorties : 230 000 investis + 125 000 de dépenses + 30 000 de retraits', () => {
    expect(totals.totalOut).toBe(230000 + 125000 + 30000)
  })

  it('solde net cohérent', () => {
    expect(totals.netBalance).toBe(679000 - 385000)
  })

  it('compte 53 mouvements d\'argent et 2 résultats calculés', () => {
    expect(totals.movementCount).toBe(25 + 5 + 20 + 3)
    expect(entries.filter((item) => item.type === 'profit')).toHaveLength(2)
  })

  it('les résultats des business terminés correspondent au module Business', () => {
    const profits = Object.fromEntries(entries.filter((item) => item.type === 'profit').map((item) => [item.businessId, item.details.result]))
    expect(profits).toEqual({ 'business-002': 27000, 'business-003': -2000 })
  })
})

describe('filtrage', () => {
  const entries = buildHistoryEntries({
    contributions: MOCK_CONTRIBUTIONS,
    businesses: MOCK_BUSINESSES,
    operations: MOCK_OPERATIONS,
    withdrawals: MOCK_WITHDRAWALS,
  })

  it('par catégorie', () => {
    expect(filterHistoryEntries(entries, { ...noFilter, type: 'contribution' })).toHaveLength(25)
    expect(filterHistoryEntries(entries, { ...noFilter, type: 'withdrawal' })).toHaveLength(3)
    expect(filterHistoryEntries(entries, { ...noFilter, type: 'revenue' })).toHaveLength(8)
  })

  it('par associé', () => {
    const cheikh = filterHistoryEntries(entries, { ...noFilter, associateId: 'cheikh-sow' })
    expect(cheikh.every((item) => item.associateId === 'cheikh-sow')).toBe(true)
    expect(cheikh.length > 0).toBe(true)
    expect(filterHistoryEntries(entries, { ...noFilter, associateId: 'cheikh-sow', type: 'contribution' })).toHaveLength(13)
  })

  it('par activité, et mouvements sans activité', () => {
    const drinks = filterHistoryEntries(entries, { ...noFilter, businessId: 'business-001' })
    expect(drinks).toHaveLength(6)
    const noBusiness = filterHistoryEntries(entries, { ...noFilter, businessId: NO_BUSINESS_FILTER })
    expect(noBusiness).toHaveLength(25 + 3)
  })

  it('par période (bornes incluses)', () => {
    const november = filterHistoryEntries(entries, { ...noFilter, startDate: '2026-11-01', endDate: '2026-11-30' })
    expect(november.every((item) => item.date >= '2026-11-01' && item.date <= '2026-11-30')).toBe(true)
    const oneDay = filterHistoryEntries(entries, { ...noFilter, startDate: '2026-11-05', endDate: '2026-11-05' })
    expect(oneDay.every((item) => item.date === '2026-11-05')).toBe(true)
    expect(oneDay.length > 0).toBe(true)
    expect(filterHistoryEntries(entries, { ...noFilter, startDate: '2026-11-10' }).every((item) => item.date >= '2026-11-10')).toBe(true)
  })

  it('recherche sans tenir compte des accents ni de la casse', () => {
    expect(filterHistoryEntries(entries, { ...noFilter, search: 'URGENCE familiale' })).toHaveLength(1)
    expect(filterHistoryEntries(entries, { ...noFilter, search: 'glaciere' })).toHaveLength(1)
    expect(filterHistoryEntries(entries, { ...noFilter, search: 'snacks' }).every((item) => item.businessId === 'business-003')).toBe(true)
  })

  it('recherche par montant', () => {
    expect(filterHistoryEntries(entries, { ...noFilter, search: '38 000' })).toHaveLength(1)
  })

  it('les filtres se combinent', () => {
    const result = filterHistoryEntries(entries, { ...noFilter, type: 'expense', associateId: 'cheikh-sow', businessId: 'business-002' })
    expect(result.map((item) => item.id)).toEqual(['history-operation-006', 'history-operation-007'])
    const withSearch = filterHistoryEntries(entries, { ...noFilter, type: 'expense', associateId: 'cheikh-sow', businessId: 'business-002', search: 'flocage' })
    expect(withSearch).toHaveLength(1)
  })

  it('cas sans résultat', () => {
    expect(filterHistoryEntries(entries, { ...noFilter, search: 'zzz introuvable' })).toHaveLength(0)
    expect(filterHistoryEntries(entries, { ...noFilter, type: 'withdrawal', businessId: 'business-001' })).toHaveLength(0)
    expect(filterHistoryEntries(entries, { ...noFilter, startDate: '2030-01-01' })).toHaveLength(0)
    expect(getHistoryTotals(filterHistoryEntries(entries, { ...noFilter, search: 'zzz' }))).toEqual({ totalIn: 0, totalOut: 0, netBalance: 0, movementCount: 0, entryCount: 0 })
  })

  it('les indicateurs suivent la période choisie', () => {
    const sept = filterHistoryEntries(entries, { ...noFilter, startDate: '2026-09-01', endDate: '2026-09-30' })
    const totals = getHistoryTotals(sept)
    expect(totals.netBalance).toBe(totals.totalIn - totals.totalOut)
    expect(totals.totalOut).toBe(sept.filter((item) => item.direction === 'out').reduce((sum, item) => sum + item.amount, 0))
  })
})

describe('période et activités', () => {
  it('détecte une période incohérente', () => {
    expect(getPeriodError('2026-11-10', '2026-11-01')).toBe('La date de début doit être antérieure ou égale à la date de fin.')
    expect(getPeriodError('2026-11-01', '2026-11-01')).toBe('')
    expect(getPeriodError('2026-11-01', '')).toBe('')
    expect(getPeriodError('', '')).toBe('')
  })

  it('liste les activités présentes, triées par nom', () => {
    const entries = buildHistoryEntries({ contributions: MOCK_CONTRIBUTIONS, businesses: MOCK_BUSINESSES, operations: MOCK_OPERATIONS, withdrawals: MOCK_WITHDRAWALS })
    const options = getBusinessOptions(entries)
    expect(options).toHaveLength(5)
    expect(options.map((option) => option.label)).toEqual([...options.map((option) => option.label)].sort((a, b) => a.localeCompare(b, 'fr')))
  })
})

describe('tri chronologique', () => {
  const entries = [entry('b', 'expense', 'out', 1, '2026-03-01'), entry('a', 'expense', 'out', 1, '2026-01-01'), entry('c', 'expense', 'out', 1, '2026-03-01'), entry('d', 'expense', 'out', 1, '2026-02-01')]

  it('du plus récent au plus ancien', () => {
    const dates = sortHistoryEntries(entries, 'date-desc').map((item) => item.date)
    expect(dates).toEqual(['2026-03-01', '2026-03-01', '2026-02-01', '2026-01-01'])
  })

  it('du plus ancien au plus récent', () => {
    expect(sortHistoryEntries(entries, 'date-asc').map((item) => item.date)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01', '2026-03-01'])
  })

  it('ne modifie pas la liste d\'origine', () => {
    sortHistoryEntries(entries, 'date-asc')
    expect(entries[0].id).toBe('b')
  })

  it('ordre stable pour une même date', () => {
    expect(sortHistoryEntries(entries, 'date-asc').slice(2).map((item) => item.id)).toEqual(['b', 'c'])
  })
})
