import { describe, expect, it } from 'vitest'
import { MOCK_BUSINESSES, MOCK_OPERATIONS } from '../src/data/businessMockData'
import { contributionsMockData } from '../src/data/contributionsMockData'
import { MOCK_WITHDRAWALS } from '../src/data/historyMockData'
import { CONTRIBUTION_ASSOCIATES, MONTHLY_TARGET_PER_ASSOCIATE } from '../src/constants/contributionSettings'
import { buildHistoryEntries } from '../src/utils/historyBuilders'
import { getBusinessFinancials } from '../src/utils/businessCalculations'
import { getNetBalance } from '../src/utils/historyCalculations'
import {
  EMPTY_TOTALS,
  addMonths,
  compareTotals,
  filterEntriesByRange,
  getActivityAssessment,
  getActivitySummary,
  getAssociateContributionStats,
  getBusinessPerformance,
  getExpenseBreakdown,
  getMonthlyContributionsByAssociate,
  getPeriodLabel,
  getPeriodRange,
  getPreviousPeriodRange,
  getProgressPercent,
  getRangeMonthKeys,
  getStatisticsTotals,
  getVariation,
  groupEntriesByMonth,
} from '../src/utils/statisticsCalculations'

const TODAY = '2026-11-12'
const entries = buildHistoryEntries({
  contributions: contributionsMockData,
  businesses: MOCK_BUSINESSES,
  operations: MOCK_OPERATIONS,
  withdrawals: MOCK_WITHDRAWALS,
})
const all = { startDate: '', endDate: '' }

describe('totaux (toute la période)', () => {
  const totals = getStatisticsTotals(entries)

  it('cotisations : 360 000 FCFA', () => expect(totals.contributions).toBe(360000))
  it('investissements : initiaux + supplémentaires = 230 000 FCFA', () => expect(totals.investments).toBe(230000))
  it('dépenses : 125 000 FCFA', () => expect(totals.expenses).toBe(125000))
  it('recettes : 319 000 FCFA', () => expect(totals.revenues).toBe(319000))
  it('retraits : 30 000 FCFA', () => expect(totals.withdrawals).toBe(30000))

  it('résultat commercial = recettes − dépenses − investissements', () => {
    expect(totals.commercialResult).toBe(319000 - 125000 - 230000)
  })

  it('résultat commercial global = somme des résultats du module Business', () => {
    const sum = MOCK_BUSINESSES.reduce((total, business) => total + getBusinessFinancials(business, MOCK_OPERATIONS).result, 0)
    expect(totals.commercialResult).toBe(sum)
    expect(sum).toBe(-36000)
  })

  it('solde net = entrées − sorties (identique à l\'Historique)', () => {
    expect(totals.netBalance).toBe(360000 + 319000 - 230000 - 125000 - 30000)
    expect(totals.netBalance).toBe(getNetBalance(entries))
  })

  it('solde net = cotisations + résultat commercial − retraits', () => {
    expect(totals.netBalance).toBe(totals.contributions + totals.commercialResult - totals.withdrawals)
  })
})

describe('absence de double comptage', () => {
  it('les bénéfices calculés ne modifient aucun total', () => {
    const withoutProfits = entries.filter((entry) => entry.type !== 'profit')
    expect(entries.some((entry) => entry.type === 'profit')).toBe(true)
    expect(getStatisticsTotals(withoutProfits)).toEqual(getStatisticsTotals(entries))
  })

  it('chaque opération n\'apparaît qu\'une fois', () => {
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length)
  })

  it('un mois ne compte que ses propres opérations : somme des mois = total', () => {
    const months = getRangeMonthKeys(all, entries, TODAY)
    const rows = groupEntriesByMonth(entries, months)
    const total = getStatisticsTotals(entries)
    expect(rows.reduce((sum, row) => sum + row.contributions, 0)).toBe(total.contributions)
    expect(rows.reduce((sum, row) => sum + row.investments, 0)).toBe(total.investments)
    expect(rows.reduce((sum, row) => sum + row.expenses, 0)).toBe(total.expenses)
    expect(rows.reduce((sum, row) => sum + row.revenues, 0)).toBe(total.revenues)
  })

  it('un mouvement n\'est pas compté dans deux périodes consécutives', () => {
    const october = filterEntriesByRange(entries, { startDate: '2026-10-01', endDate: '2026-10-31' })
    const november = filterEntriesByRange(entries, { startDate: '2026-11-01', endDate: '2026-11-30' })
    const ids = new Set(october.map((entry) => entry.id))
    expect(november.some((entry) => ids.has(entry.id))).toBe(false)
  })
})

describe('regroupements mensuels', () => {
  it('12 mois de cotisations de décembre 2025 à novembre 2026, plus les mois sans mouvement', () => {
    const months = getRangeMonthKeys(all, entries, TODAY)
    expect(months[0]).toBe('2025-12')
    expect(months[months.length - 1]).toBe('2026-11')
    expect(months).toHaveLength(12)
  })

  it('regroupe selon les dates réelles', () => {
    const rows = groupEntriesByMonth(entries, ['2026-09', '2026-08'])
    expect(rows[0].contributions).toBe(30000)
    expect(rows[0].investments).toBe(40000 + 10000)
    expect(rows[0].expenses).toBe(15000 + 5000)
    expect(rows[0].revenues).toBe(38000 + 42000 + 52000)
    expect(rows[1].revenues).toBe(55000 + 27000)
    expect(rows[0].label).toBe('Septembre 2026')
  })

  it('un mois sans mouvement vaut 0', () => {
    const [row] = groupEntriesByMonth([], ['2026-01'])
    expect(row.contributions + row.investments + row.expenses + row.revenues).toBe(0)
  })
})

describe('filtres de période', () => {
  it('Cette semaine : du lundi à aujourd\'hui', () => {
    expect(getPeriodRange({ periodKey: 'week', todayIso: TODAY })).toEqual({ startDate: '2026-11-09', endDate: TODAY })
    expect(getPeriodRange({ periodKey: 'week', todayIso: '2026-11-15' }).startDate).toBe('2026-11-09')
    expect(getPeriodRange({ periodKey: 'week', todayIso: '2026-11-09' }).startDate).toBe('2026-11-09')
  })

  it('Ce mois, 3 mois, 6 mois, cette année, toute la période', () => {
    expect(getPeriodRange({ periodKey: 'month', todayIso: TODAY })).toEqual({ startDate: '2026-11-01', endDate: TODAY })
    expect(getPeriodRange({ periodKey: '3months', todayIso: TODAY })).toEqual({ startDate: '2026-08-13', endDate: TODAY })
    expect(getPeriodRange({ periodKey: '6months', todayIso: TODAY })).toEqual({ startDate: '2026-05-13', endDate: TODAY })
    expect(getPeriodRange({ periodKey: 'year', todayIso: TODAY })).toEqual({ startDate: '2026-01-01', endDate: TODAY })
    expect(getPeriodRange({ periodKey: 'all', todayIso: TODAY })).toEqual(all)
  })

  it('période personnalisée', () => {
    expect(getPeriodRange({ periodKey: 'custom', customStartDate: '2026-09-01', customEndDate: '2026-09-30', todayIso: TODAY })).toEqual({ startDate: '2026-09-01', endDate: '2026-09-30' })
  })

  it('filtre les mouvements (bornes incluses)', () => {
    const range = getPeriodRange({ periodKey: 'custom', customStartDate: '2026-09-01', customEndDate: '2026-09-30', todayIso: TODAY })
    const september = filterEntriesByRange(entries, range)
    expect(september.every((entry) => entry.date >= '2026-09-01' && entry.date <= '2026-09-30')).toBe(true)
    expect(getStatisticsTotals(september).contributions).toBe(30000)
  })

  it('addMonths ramène le jour au dernier jour du mois', () => {
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28')
    expect(addMonths('2026-11-12', -3)).toBe('2026-08-12')
  })

  it('libellé de période', () => {
    expect(getPeriodLabel(all)).toBe('Toute la période')
    expect(getPeriodLabel({ startDate: '2026-11-01', endDate: '2026-11-12' })).toBe('Du 01/11/2026 au 12/11/2026')
  })
})

describe('période précédente', () => {
  it('semaine, mois et année : mêmes jours écoulés de la période précédente', () => {
    const week = getPeriodRange({ periodKey: 'week', todayIso: TODAY })
    expect(getPreviousPeriodRange({ periodKey: 'week', range: week })).toEqual({ startDate: '2026-11-02', endDate: '2026-11-05' })
    const month = getPeriodRange({ periodKey: 'month', todayIso: TODAY })
    expect(getPreviousPeriodRange({ periodKey: 'month', range: month })).toEqual({ startDate: '2026-10-01', endDate: '2026-10-12' })
    const year = getPeriodRange({ periodKey: 'year', todayIso: TODAY })
    expect(getPreviousPeriodRange({ periodKey: 'year', range: year })).toEqual({ startDate: '2025-01-01', endDate: '2025-11-12' })
  })

  it('3 mois et période personnalisée : même durée juste avant', () => {
    const range = getPeriodRange({ periodKey: '3months', todayIso: TODAY })
    const previous = getPreviousPeriodRange({ periodKey: '3months', range })
    expect(previous.endDate).toBe('2026-08-12')
    expect(previous.startDate).toBe('2026-05-13')
    expect(getPreviousPeriodRange({ periodKey: 'custom', range: { startDate: '2026-09-01', endDate: '2026-09-30' } })).toEqual({ startDate: '2026-08-02', endDate: '2026-08-31' })
  })

  it('pas de comparaison pour « toute la période » ni pour une période ouverte ou incohérente', () => {
    expect(getPreviousPeriodRange({ periodKey: 'all', range: all })).toBeNull()
    expect(getPreviousPeriodRange({ periodKey: 'custom', range: { startDate: '2026-09-01', endDate: '' } })).toBeNull()
    expect(getPreviousPeriodRange({ periodKey: 'custom', range: { startDate: '2026-10-01', endDate: '2026-09-01' } })).toBeNull()
  })
})

describe('évolution et divisions par zéro', () => {
  it('calcule le pourcentage d\'évolution', () => {
    expect(getVariation(150, 100)).toEqual({ percent: 50, trend: 'up' })
    expect(getVariation(50, 100)).toEqual({ percent: -50, trend: 'down' })
    expect(getVariation(100, 100)).toEqual({ percent: 0, trend: 'flat' })
  })

  it('valeur précédente nulle : pas de division par zéro', () => {
    expect(getVariation(5000, 0)).toEqual({ percent: null, trend: 'new' })
    expect(getVariation(0, 0)).toEqual({ percent: null, trend: 'flat' })
  })

  it('valeur précédente négative : la hausse reste une hausse', () => {
    expect(getVariation(-10000, -40000)).toEqual({ percent: 75, trend: 'up' })
  })

  it('progression : objectif nul = 0 %', () => {
    expect(getProgressPercent(15000, 15000)).toBe(100)
    expect(getProgressPercent(7500, 15000)).toBe(50)
    expect(getProgressPercent(5000, 0)).toBe(0)
  })

  it('compare tous les totaux, ou aucun sans période précédente', () => {
    const comparison = compareTotals({ ...EMPTY_TOTALS, revenues: 200 }, { ...EMPTY_TOTALS, revenues: 100 })
    expect(comparison.revenues).toEqual({ percent: 100, trend: 'up' })
    expect(comparison.expenses).toEqual({ percent: null, trend: 'flat' })
    expect(compareTotals(EMPTY_TOTALS, null).revenues).toBeNull()
  })
})

describe('répartition des dépenses', () => {
  const breakdown = getExpenseBreakdown(entries)

  it('regroupe par catégorie, de la plus élevée à la plus faible', () => {
    const labels = breakdown.map((item) => item.label)
    expect(labels[0]).toBe('Achat de marchandises')
    expect(breakdown[0].amount).toBe(15000 + 20000 + 20000 + 35000)
    expect(breakdown.map((item) => item.amount)).toEqual([...breakdown.map((item) => item.amount)].sort((a, b) => b - a))
  })

  it('le total des catégories égale le total des dépenses', () => {
    expect(breakdown.reduce((sum, item) => sum + item.amount, 0)).toBe(125000)
  })

  it('les pourcentages sont cohérents', () => {
    expect(breakdown.find((item) => item.label === 'Transport').percent).toBe(Math.round((5000 + 3000 + 6000) / 125000 * 100))
  })

  it('sans dépense : liste vide', () => {
    expect(getExpenseBreakdown([])).toEqual([])
    expect(getExpenseBreakdown(entries.filter((entry) => entry.type === 'contribution'))).toEqual([])
  })

  it('dépense sans catégorie : « Autre dépense »', () => {
    const [item] = getExpenseBreakdown([{ type: 'expense', amount: 1000, details: {} }])
    expect(item).toEqual({ label: 'Autre dépense', amount: 1000, percent: 100 })
  })
})

describe('résultats par activité', () => {
  const performance = getBusinessPerformance(entries, MOCK_BUSINESSES)

  it('correspond aux résultats du module Business', () => {
    const results = Object.fromEntries(performance.map((item) => [item.businessId, item.result]))
    expect(results['business-001']).toBe(10000)
    expect(results['business-002']).toBe(27000)
    expect(results['business-003']).toBe(-2000)
    expect(results['business-004']).toBe(-41000)
    expect(results['business-005']).toBe(-30000)
  })

  it('classe de la plus à la moins rentable', () => {
    expect(performance[0].businessId).toBe('business-002')
    expect(performance[performance.length - 1].businessId).toBe('business-004')
  })

  it('détaille investi, dépenses et recettes', () => {
    const tshirts = performance.find((item) => item.businessId === 'business-002')
    expect([tshirts.invested, tshirts.expenses, tshirts.revenues]).toEqual([45000, 35000, 107000])
  })

  it('sur une période, seules les activités concernées apparaissent', () => {
    const november = filterEntriesByRange(entries, { startDate: '2026-11-01', endDate: '2026-11-30' })
    const ids = getBusinessPerformance(november, MOCK_BUSINESSES).map((item) => item.businessId).sort()
    expect(ids).toEqual(['business-004', 'business-005'])
  })

  it('une activité en cours n\'est jamais déclarée déficitaire', () => {
    const ongoingLoss = performance.find((item) => item.businessId === 'business-004')
    expect(ongoingLoss.kind).toBe('loss')
    expect(getActivityAssessment(ongoingLoss)).toEqual({ label: 'Résultat provisoire', tone: 'info', isProvisional: true })
    expect(getActivityAssessment(performance.find((item) => item.businessId === 'business-003')).label).toBe('Déficitaire')
    expect(getActivityAssessment(performance.find((item) => item.businessId === 'business-002')).label).toBe('Rentable')
  })

  it('synthèse : nombres d\'activités, plus et moins rentable', () => {
    const summary = getActivitySummary(performance)
    expect(summary).toMatchObject({ total: 5, ongoing: 3, completed: 2 })
    expect(summary.best.businessId).toBe('business-002')
    expect(summary.worst.businessId).toBe('business-004')
  })

  it('une seule activité : pas de « moins rentable »', () => {
    const summary = getActivitySummary(performance.slice(0, 1))
    expect(summary.best.businessId).toBe('business-002')
    expect(summary.worst).toBeNull()
  })

  it('aucune activité', () => {
    expect(getActivitySummary([])).toEqual({ total: 0, ongoing: 0, completed: 0, best: null, worst: null })
    expect(getBusinessPerformance([], MOCK_BUSINESSES)).toEqual([])
  })
})

describe('comparaison des cotisations entre associés', () => {
  it('toute la période : 180 000 FCFA chacun pour 12 mois d\'objectif à 15 000', () => {
    const monthCount = getRangeMonthKeys(all, entries, TODAY).length
    const stats = getAssociateContributionStats({ entries, associates: CONTRIBUTION_ASSOCIATES, monthCount, monthlyTarget: MONTHLY_TARGET_PER_ASSOCIATE })
    expect(stats.map((item) => item.associate.id)).toEqual(['mohamed-bakhoum', 'cheikh-sow'])
    expect(stats.map((item) => item.total)).toEqual([180000, 180000])
    expect(stats.map((item) => item.target)).toEqual([180000, 180000])
    expect(stats.map((item) => item.percent)).toEqual([100, 100])
    expect(stats.every((item) => item.isComplete)).toBe(true)
  })

  it('progression partielle : septembre, Cheikh a versé 15 000 en deux fois', () => {
    const september = filterEntriesByRange(entries, { startDate: '2026-09-01', endDate: '2026-09-30' })
    const stats = getAssociateContributionStats({ entries: september, associates: CONTRIBUTION_ASSOCIATES, monthCount: 1, monthlyTarget: 15000 })
    expect(stats[1].total).toBe(15000)
    expect(stats[1].count).toBe(2)
  })

  it('un versement manquant laisse un reste à cotiser', () => {
    const missing = entries.filter((entry) => !(entry.type === 'contribution' && entry.associateId === 'cheikh-sow' && entry.date.startsWith('2026-11')))
    const stats = getAssociateContributionStats({ entries: missing.filter((entry) => entry.date.startsWith('2026-11')), associates: CONTRIBUTION_ASSOCIATES, monthCount: 1, monthlyTarget: 15000 })
    expect(stats[0].percent).toBe(100)
    expect(stats[1]).toMatchObject({ total: 0, percent: 0, remaining: 15000, isComplete: false })
  })

  it('objectif nul : 0 %, jamais de division par zéro', () => {
    const stats = getAssociateContributionStats({ entries, associates: CONTRIBUTION_ASSOCIATES, monthCount: 0, monthlyTarget: 15000 })
    expect(stats.every((item) => item.percent === 0 && item.isComplete === false)).toBe(true)
  })

  it('progression mensuelle par associé', () => {
    const months = ['2026-08', '2026-09']
    const rows = getMonthlyContributionsByAssociate(entries, months, CONTRIBUTION_ASSOCIATES)
    expect(rows).toHaveLength(2)
    expect(rows[0]['mohamed-bakhoum']).toBe(15000)
    expect(rows[1]['cheikh-sow']).toBe(15000)
  })
})

describe('périodes sans données', () => {
  const emptyRange = { startDate: '2030-01-01', endDate: '2030-01-31' }
  const none = filterEntriesByRange(entries, emptyRange)

  it('aucun mouvement, tous les totaux à zéro', () => {
    expect(none).toHaveLength(0)
    expect(getStatisticsTotals(none)).toEqual(EMPTY_TOTALS)
  })

  it('aucun mois dans une période future ou antérieure à la création du fonds', () => {
    expect(getRangeMonthKeys(emptyRange, entries, TODAY)).toEqual([])
    expect(getRangeMonthKeys({ startDate: '2020-01-01', endDate: '2020-12-31' }, entries, TODAY)).toEqual([])
  })

  it('sans aucun mouvement du tout : aucun mois', () => {
    expect(getRangeMonthKeys(all, [], TODAY)).toEqual([])
  })

  it('une période personnalisée trop ancienne est ramenée au début des données', () => {
    const months = getRangeMonthKeys({ startDate: '2020-01-01', endDate: '' }, entries, TODAY)
    expect(months[0]).toBe('2025-12')
  })

  it('l\'évolution sans donnée précédente évite la division par zéro', () => {
    expect(compareTotals(getStatisticsTotals(entries), getStatisticsTotals(none)).contributions).toEqual({ percent: null, trend: 'new' })
  })
})
