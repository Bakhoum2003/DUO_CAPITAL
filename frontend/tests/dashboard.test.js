import { describe, expect, it } from 'vitest'
import { dashboardReducer, initialDashboardState } from '../src/hooks/dashboardState'
import {
  DEFAULT_FILTER, buildDashboardPath, buildKpiCards, formatActivityAmount, formatAxisKey, hasAmounts, hasPoints, isFilterReady, validateCustomRange,
} from '../src/utils/dashboardViewModel'

const sample = (overrides = {}) => ({
  treasury: { balance: 55000 },
  capital: { totalToDate: 30000, periodContributions: 30000 },
  investments: { total: 20000, count: 1 },
  expenses: { total: 3000, count: 1, thisMonth: 3000 },
  revenues: { total: 40000, count: 1, thisMonth: 0 },
  result: { amount: 37000, kind: 'PROFIT', isProvisional: true },
  contributions: { expectedAvailable: true, expected: 60000, remaining: 30000, realizationRate: 50 },
  ...overrides,
})

describe('requête du dashboard', () => {
  it('construit l\'URL sans jamais envoyer d\'identité', () => {
    expect(buildDashboardPath(DEFAULT_FILTER)).toBe('/api/v1/dashboard?period=all')
    expect(buildDashboardPath({ period: 'month', from: '2026-01-01', to: '2026-01-02' })).toBe('/api/v1/dashboard?period=month')
    expect(buildDashboardPath({ period: 'custom', from: '2026-01-01', to: '2026-01-31' })).toBe('/api/v1/dashboard?period=custom&from=2026-01-01&to=2026-01-31')
  })

  it('valide la période personnalisée', () => {
    expect(validateCustomRange('', '')).toMatch(/date de début/)
    expect(validateCustomRange('2026-03-02', '2026-03-01')).toMatch(/précéder/)
    expect(validateCustomRange('2000-01-01', '2026-03-01')).toMatch(/10 ans/)
    expect(validateCustomRange('2026-03-01', '2026-03-31')).toBeNull()
    expect(isFilterReady({ period: 'custom', from: '', to: '' })).toBe(false)
    expect(isFilterReady({ period: 'week', from: '', to: '' })).toBe(true)
  })
})

describe('indicateurs', () => {
  it('affiche les montants du serveur et le résultat signé', () => {
    const cards = Object.fromEntries(buildKpiCards(sample()).map((card) => [card.id, card]))
    expect(cards.treasury.valueLabel).toContain('55')
    expect(cards.result.title).toBe('Bénéfice')
    expect(cards.result.valueLabel).toMatch(/^\+/)
    expect(cards.result.footnote).toMatch(/Provisoire/)
    expect(cards.investments.footnote).toContain('1 opération')
  })

  it('perte et trésorerie négative en rouge', () => {
    const cards = Object.fromEntries(buildKpiCards(sample({ treasury: { balance: -5 }, result: { amount: -3000, kind: 'LOSS', isProvisional: false } })).map((card) => [card.id, card]))
    expect(cards.treasury.tone).toBe('red')
    expect(cards.result.title).toBe('Perte')
    expect(cards.result.valueLabel).toMatch(/^−/)
  })

  it('cotisations attendues indisponibles : « Non calculable », jamais 0', () => {
    const cards = Object.fromEntries(buildKpiCards(sample({ contributions: { expectedAvailable: false } })).map((card) => [card.id, card]))
    expect(cards.remaining.valueLabel).toBe('Non calculable')
    expect(cards.contributions.footnote).toMatch(/non calculable/)
  })
})

describe('graphiques et activités', () => {
  it('distingue vide et zéro', () => {
    expect(hasPoints([])).toBe(false)
    expect(hasPoints([{ key: '2026-11' }])).toBe(true)
    expect(hasAmounts([])).toBe(false)
    expect(hasAmounts([{ amount: 0 }])).toBe(false)
    expect(hasAmounts([{ amount: 5 }])).toBe(true)
  })

  it('libellés d\'axe et montants d\'activité signés', () => {
    expect(formatAxisKey('2026-11-05', 'day')).toBe('05/11')
    expect(formatAxisKey('2026-11', 'month')).toMatch(/nov/)
    expect(formatActivityAmount({ direction: 'IN', amount: 1000 })).toMatch(/^\+/)
    expect(formatActivityAmount({ direction: 'OUT', amount: 1000 })).toMatch(/^−/)
  })
})

describe('état du chargement', () => {
  it('chargement → succès → actualisation sans perdre les données → échec conservant les données', () => {
    let state = dashboardReducer(initialDashboardState, { type: 'request', requestId: 1 })
    expect(state.status).toBe('loading')
    state = dashboardReducer(state, { type: 'success', requestId: 1, data: { a: 1 } })
    expect(state.status).toBe('ready')
    state = dashboardReducer(state, { type: 'request', requestId: 2 })
    expect(state.status).toBe('refreshing')
    expect(state.data).toEqual({ a: 1 })
    state = dashboardReducer(state, { type: 'failure', requestId: 2, message: 'Erreur' })
    expect(state.status).toBe('error')
    expect(state.data).toEqual({ a: 1 })
    expect(state.errorMessage).toBe('Erreur')
  })

  it('ignore la réponse d\'une requête périmée', () => {
    let state = dashboardReducer(initialDashboardState, { type: 'request', requestId: 1 })
    state = dashboardReducer(state, { type: 'request', requestId: 2 })
    const after = dashboardReducer(state, { type: 'success', requestId: 1, data: { old: true } })
    expect(after).toBe(state)
    expect(dashboardReducer(state, { type: 'failure', requestId: 1, message: 'x' })).toBe(state)
  })

  it('un échec initial n\'invente aucune donnée', () => {
    let state = dashboardReducer(initialDashboardState, { type: 'request', requestId: 1 })
    state = dashboardReducer(state, { type: 'failure', requestId: 1, message: 'Hors ligne' })
    expect(state.data).toBeNull()
    expect(state.status).toBe('error')
  })
})
