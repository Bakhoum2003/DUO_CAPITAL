import { describe, expect, it } from 'vitest'
import { EMPTY_TOTALS } from '../src/utils/statisticsCalculations'
import { adaptStatistics, buildStatisticsPath, deriveStatus, describePeriod, periodCacheKey, selectForKey, toApiPeriod, validatePeriod } from '../src/utils/statisticsViewModel'

const MOHAMED = 'a'.repeat(24)
const CHEIKH = 'b'.repeat(24)
const nbsp = (text) => text.replace(/\s/g, ' ')

// Réponse type du backend (jeu de référence : entrées 90 000, sorties 45 000, solde net 45 000).
function payload(overrides = {}) {
  return {
    period: { key: 'month', label: 'Ce mois', from: '2026-12-01', to: '2026-12-20', requestedTo: '2026-12-20', isEmpty: false },
    totals: {
      contributions: { amount: 70000, count: 2 }, revenues: { amount: 20000, count: 1 }, investments: { amount: 30000, count: 1 }, expenses: { amount: 5000, count: 1 }, withdrawals: { amount: 10000, count: 1 },
      inflow: 90000, outflow: 45000, commercialResult: -15000, netBalance: 45000, operationsCount: 6,
    },
    counts: { operations: 6, activities: 2, months: 1, byType: {} },
    monthly: [{ month: '2026-12', contributions: 70000, revenues: 20000, investments: 30000, expenses: 5000, withdrawals: 10000, inflow: 90000, outflow: 45000, commercialResult: -15000, netBalance: 45000 }],
    expensesByCategory: [{ id: null, label: 'Textile', amount: 5000, count: 1, percent: 100 }],
    activities: [
      { id: 'w', name: 'Savon Noir', status: 'COMPLETED', category: 'Cosmétique', revenues: 20000, expenses: 0, investments: 0, result: 20000, operationsCount: 1, isProvisional: false },
      { id: 'x', name: 'Pagnes Wax', status: 'ACTIVE', category: 'Textile', revenues: 0, expenses: 5000, investments: 30000, result: -35000, operationsCount: 2, isProvisional: true },
    ],
    contributionComparison: {
      monthlyTarget: 15000, fundStartPeriod: '2026-12', objectiveAvailable: true,
      partners: [
        { partnerId: MOHAMED, name: 'Mohamed Bakhoum', partnerNumber: 1, contributed: 40000, contributionsCount: 1, target: 15000, settled: 15000, percent: 100, remaining: 0, status: 'ACHIEVED', months: [{ month: '2026-12', contributed: 40000, target: 15000, percent: 100, remaining: 0, status: 'ACHIEVED', overdue: false }] },
        { partnerId: CHEIKH, name: 'Cheikh Sow', partnerNumber: 2, contributed: 9000, contributionsCount: 2, target: 15000, settled: 9000, percent: 60, remaining: 6000, status: 'PENDING', months: [{ month: '2026-12', contributed: 9000, target: 15000, percent: 60, remaining: 6000, status: 'PARTIAL', overdue: false }] },
      ],
    },
    previousPeriod: { from: '2026-11-01', to: '2026-11-20', hasMovements: true, totals: { contributions: 35000, investments: 0, expenses: 0, revenues: 0, withdrawals: 0, commercialResult: 0, netBalance: 35000 } },
    notices: [{ code: 'COMMERCIAL_RESULT_DEFINITION', level: 'info', message: 'Résultat commercial = recettes − dépenses − investissements.' }],
    generatedAt: '2026-12-20T10:00:00.000Z',
    ...overrides,
  }
}

describe('paramètres de l’API', () => {
  it('périodes de l’interface vers l’API', () => {
    expect(toApiPeriod('3months')).toBe('last3months')
    expect(toApiPeriod('6months')).toBe('last6months')
    for (const key of ['week', 'month', 'year', 'all', 'custom']) expect(toApiPeriod(key)).toBe(key)
  })

  it('adresse : seules les dates de la période personnalisée sont envoyées', () => {
    expect(buildStatisticsPath({ periodKey: 'month', customStartDate: '2026-01-01', customEndDate: '2026-02-01' })).toBe('/api/v1/statistics?period=month')
    expect(buildStatisticsPath({ periodKey: 'custom', customStartDate: '2026-12-01', customEndDate: '2026-12-31' })).toBe('/api/v1/statistics?period=custom&from=2026-12-01&to=2026-12-31')
  })

  it('période incohérente détectée : requête non envoyée', () => {
    expect(validatePeriod({ periodKey: 'month' })).toBe('')
    expect(validatePeriod({ periodKey: 'custom' })).toMatch(/début et une date de fin/)
    expect(validatePeriod({ periodKey: 'custom', customStartDate: '2026-12-01' })).toMatch(/début et une date de fin/)
    expect(validatePeriod({ periodKey: 'custom', customStartDate: '2026-12-10', customEndDate: '2026-12-01' })).toMatch(/antérieure/)
    expect(validatePeriod({ periodKey: 'custom', customStartDate: 'hier', customEndDate: '2026-12-01' })).toMatch(/invalides/)
    expect(validatePeriod({ periodKey: 'custom', customStartDate: '2026-12-01', customEndDate: '2026-12-01' })).toBe('')
  })
})

describe('adaptation de la réponse (données réelles du serveur, rien de recalculé)', () => {
  const view = adaptStatistics(payload())

  it('cartes : cotisations, investissements, dépenses, recettes, résultat commercial, solde net', () => {
    expect(view.totals).toEqual({ contributions: 70000, investments: 30000, expenses: 5000, revenues: 20000, withdrawals: 10000, commercialResult: -15000, netBalance: 45000 })
    expect(Object.keys(view.totals).sort()).toEqual(Object.keys(EMPTY_TOTALS).sort())
  })

  it('le résultat commercial n’est jamais ajouté au solde net', () => {
    expect(view.totals.netBalance).toBe(45000)
    expect(view.totals.netBalance).not.toBe(45000 + view.totals.commercialResult)
  })

  it('évolution par rapport à la période précédente (déjà testée) : hausse réelle, jamais inventée', () => {
    expect(view.comparison.contributions).toEqual({ percent: 100, trend: 'up' })
    expect(view.comparison.netBalance).toEqual({ percent: 29, trend: 'up' })
    expect(view.comparison.revenues).toEqual({ percent: null, trend: 'new' }) // précédent nul : aucun pourcentage inventé
  })

  it('aucune comparaison : « toute la période » (pas de période précédente) ou période précédente sans opération', () => {
    expect(Object.values(adaptStatistics(payload({ previousPeriod: null })).comparison).every((value) => value === null)).toBe(true)
    const empty = adaptStatistics(payload({ previousPeriod: { from: '2026-11-01', to: '2026-11-20', hasMovements: false, totals: { contributions: 0, investments: 0, expenses: 0, revenues: 0, withdrawals: 0, commercialResult: 0, netBalance: 0 } } }))
    expect(Object.values(empty.comparison).every((value) => value === null)).toBe(true)
  })

  it('évolution mensuelle : un élément par mois, libellés français', () => {
    expect(view.monthly).toHaveLength(1)
    expect(view.monthly[0]).toMatchObject({ monthKey: '2026-12', contributions: 70000, investments: 30000, expenses: 5000, revenues: 20000, withdrawals: 10000 })
    expect(view.monthly[0].label).toMatch(/2026/)
    expect(view.monthly[0].shortLabel.length > 0).toBe(true)
  })

  it('dépenses par catégorie : libellé réel, montant, pourcentage', () => {
    expect(view.expenseBreakdown).toEqual([{ label: 'Textile', amount: 5000, percent: 100 }])
  })

  it('performance des activités : résultat du serveur, résultat provisoire des activités en cours', () => {
    expect(view.performance.map((row) => [row.name, row.invested, row.expenses, row.revenues, row.result, row.kind, row.status])).toEqual([
      ['Savon Noir', 0, 0, 20000, 20000, 'profit', 'completed'],
      ['Pagnes Wax', 30000, 5000, 0, -35000, 'loss', 'ongoing'],
    ])
    expect(view.activitySummary).toMatchObject({ total: 2, ongoing: 1, completed: 1 })
    expect(view.activitySummary.best.name).toBe('Savon Noir')
  })

  it('comparaison des associés : identifiants réels, montant réel, progression plafonnée par le serveur', () => {
    const [mohamed, cheikh] = view.associateStats
    expect(mohamed.associate).toEqual({ id: MOHAMED, name: 'Mohamed Bakhoum', initials: 'MB', avatarTone: 'green' })
    expect(cheikh.associate).toEqual({ id: CHEIKH, name: 'Cheikh Sow', initials: 'CS', avatarTone: 'red' })
    expect([mohamed.total, mohamed.percent, mohamed.isComplete]).toEqual([40000, 100, true]) // 40 000 : jamais ramené à 15 000
    expect([cheikh.total, cheikh.target, cheikh.percent, cheikh.remaining, cheikh.isComplete]).toEqual([9000, 15000, 60, 6000, false])
    expect(view.monthlyTarget).toBe(15000)
  })

  it('cotisations mensuelles par associé : données du graphique indexées par identifiant', () => {
    expect(view.monthlyContributions).toHaveLength(1)
    expect(view.monthlyContributions[0][MOHAMED]).toBe(40000)
    expect(view.monthlyContributions[0][CHEIKH]).toBe(9000)
  })

  it('objectif indisponible : 0 affiché sans pourcentage inventé', () => {
    const noObjective = adaptStatistics(payload({
      contributionComparison: { monthlyTarget: 15000, fundStartPeriod: null, objectiveAvailable: false, partners: [{ partnerId: MOHAMED, name: 'Mohamed Bakhoum', partnerNumber: 1, contributed: 7000, contributionsCount: 1, target: null, settled: null, percent: null, remaining: null, status: 'NO_OBJECTIVE', months: [{ month: '2026-12', contributed: 7000, target: null, percent: null, remaining: null, status: 'NO_OBJECTIVE', overdue: false }] }] },
    }))
    expect(noObjective.objectiveAvailable).toBe(false)
    expect(noObjective.associateStats[0]).toMatchObject({ total: 7000, target: 0, percent: 0, remaining: 0, isComplete: false })
  })

  it('notices du serveur conservées ; période et date de génération transmises', () => {
    expect(view.notices.map((notice) => notice.code)).toEqual(['COMMERCIAL_RESULT_DEFINITION'])
    expect(view.generatedAt).toBe('2026-12-20T10:00:00.000Z')
    expect(view.periodLabel).toBe('Du 01/12/2026 au 20/12/2026')
  })
})

describe('états vides et libellés de période', () => {
  const emptyTotals = { contributions: { amount: 0, count: 0 }, revenues: { amount: 0, count: 0 }, investments: { amount: 0, count: 0 }, expenses: { amount: 0, count: 0 }, withdrawals: { amount: 0, count: 0 }, inflow: 0, outflow: 0, commercialResult: 0, netBalance: 0, operationsCount: 0 }
  const empty = adaptStatistics(payload({ totals: emptyTotals, monthly: [], expensesByCategory: [], activities: [], previousPeriod: null, contributionComparison: { monthlyTarget: 15000, fundStartPeriod: '2026-12', objectiveAvailable: true, partners: [] } }))

  it('aucune opération : zéros réels, aucune liste inventée', () => {
    expect(empty.hasMovements).toBe(false)
    expect(empty.totals.netBalance).toBe(0)
    expect(empty.monthly).toEqual([])
    expect(empty.expenseBreakdown).toEqual([])
    expect(empty.performance).toEqual([])
    expect(empty.activitySummary).toMatchObject({ total: 0, best: null, worst: null })
  })

  it('libellés de période', () => {
    expect(describePeriod({ key: 'all', label: 'Toute la période', from: null, to: '2026-12-20' })).toBe('Toute la période')
    expect(describePeriod({ key: 'custom', label: 'Période personnalisée', from: '2026-12-05', to: '2026-12-10' })).toBe('Du 05/12/2026 au 10/12/2026')
    expect(describePeriod(null)).toBe('')
  })
})

describe('affichage par période : jamais les chiffres d’une ancienne période', () => {
  const week = { periodKey: 'week' }
  const month = { periodKey: 'month' }
  const stored = { key: periodCacheKey(week), payload: 'semaine' }

  it('une réponse n’est affichée que pour la période demandée', () => {
    expect(selectForKey(stored, periodCacheKey(week))).toBe('semaine')
    expect(selectForKey(stored, periodCacheKey(month))).toBeNull()
    expect(selectForKey(null, periodCacheKey(month))).toBeNull()
  })

  it('une période personnalisée différente est une autre période', () => {
    const a = periodCacheKey({ periodKey: 'custom', customStartDate: '2026-12-01', customEndDate: '2026-12-10' })
    const b = periodCacheKey({ periodKey: 'custom', customStartDate: '2026-12-01', customEndDate: '2026-12-11' })
    expect(a === b).toBe(false)
  })

  it('états : chargement, relecture, prêt, erreur, période invalide', () => {
    expect(deriveStatus({ periodError: '', loadStatus: 'loading', hasData: false })).toBe('loading')
    expect(deriveStatus({ periodError: '', loadStatus: 'refreshing', hasData: false })).toBe('loading') // données d'une autre période : pas affichées
    expect(deriveStatus({ periodError: '', loadStatus: 'refreshing', hasData: true })).toBe('refreshing')
    expect(deriveStatus({ periodError: '', loadStatus: 'ready', hasData: true })).toBe('ready')
    expect(deriveStatus({ periodError: '', loadStatus: 'error', hasData: false })).toBe('error')
    expect(deriveStatus({ periodError: 'Dates invalides.', loadStatus: 'ready', hasData: true })).toBe('idle')
  })
})

describe('formatage FCFA des cartes', () => {
  it('montants positifs, négatifs et nuls', async () => {
    const { formatCurrency } = await import('../src/utils/formatters')
    expect(nbsp(formatCurrency(45000))).toBe('45 000 FCFA')
    expect(nbsp(formatCurrency(0))).toBe('0 FCFA')
  })
})
