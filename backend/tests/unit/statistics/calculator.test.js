import { describe, expect, it } from 'vitest'
import { computeStatistics, totalsOf } from '../../../src/services/statistics/calculator.js'
import { previousPeriodRange, resolveStatisticsRange } from '../../../src/services/statistics/periods.js'

const TODAY = '2026-12-20'
const P1 = '111111111111111111111111'
const P2 = '222222222222222222222222'
const WAX = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const SOAP = 'bbbbbbbbbbbbbbbbbbbbbbbb'
const PLAIN = 'cccccccccccccccccccccccc'
const partners = [
  { id: P1, name: 'Mohamed Bakhoum', partnerNumber: 1 },
  { id: P2, name: 'Cheikh Sow', partnerNumber: 2 },
]
const businesses = [
  { _id: WAX, name: 'Pagnes Wax', category: 'Textile', status: 'ACTIVE' },
  { _id: SOAP, name: 'Savon Noir', category: 'Cosmétique', status: 'COMPLETED' },
  { _id: PLAIN, name: 'Sans catégorie', category: null, status: 'ACTIVE' },
]
let counter = 0
const id = () => String(++counter).padStart(24, '0')
const contribution = (partner, amount, contributionDate, period = contributionDate.slice(0, 7)) => ({ _id: id(), partner, amount, contributionDate, period, note: null, createdAt: new Date() })
const operation = (business, type, amount, operationDate) => ({ _id: id(), business, type, amount, operationDate, description: '', concernedPartner: null, createdAt: new Date() })
const withdrawal = (beneficiary, amount, withdrawalDate) => ({ _id: id(), beneficiary, amount, withdrawalDate, reason: 'Besoin', createdAt: new Date() })

// Jeu de référence (aujourd'hui = 20 décembre 2026).
const data = {
  contributions: [
    contribution(P1, 15000, '2026-12-02'),
    contribution(P2, 10000, '2026-12-03'),
    contribution(P2, 5000, '2026-12-10'), // 2e versement du même mois
    contribution(P1, 20000, '2026-12-15'), // au-dessus de l'objectif : jamais plafonné
    contribution(P1, 15000, '2026-12-28', '2027-01'), // futur : ignoré
    contribution(P1, 7000, '2026-11-20'), // avant le début du fonds
  ],
  operations: [
    operation(WAX, 'INVESTMENT', 30000, '2026-12-01'),
    operation(WAX, 'EXPENSE', 5000, '2026-12-05'),
    operation(SOAP, 'EXPENSE', 3000, '2026-12-06'),
    operation(PLAIN, 'EXPENSE', 2000, '2026-12-07'),
    operation(WAX, 'REVENUE', 20000, '2026-12-08'),
    operation(SOAP, 'REVENUE', 4000, '2026-11-25'),
    operation(WAX, 'EXPENSE', 9000, '2026-12-30'), // futur : ignoré
  ],
  withdrawals: [withdrawal(P1, 10000, '2026-12-18')],
}

function compute(period = 'all', extra = {}, overrides = {}) {
  const range = resolveStatisticsRange({ period, ...extra }, TODAY)
  return computeStatistics({ today: TODAY, range, previousRange: previousPeriodRange(range), fundStartPeriod: '2026-12', monthlyTarget: 15000, partners, businesses, ...data, ...overrides })
}

describe('totaux de toute la période', () => {
  const { totals } = compute()
  it('montants par type', () => {
    expect(totals.contributions).toEqual({ amount: 57000, count: 5 })
    expect(totals.revenues).toEqual({ amount: 24000, count: 2 })
    expect(totals.investments).toEqual({ amount: 30000, count: 1 })
    expect(totals.expenses).toEqual({ amount: 10000, count: 3 })
    expect(totals.withdrawals).toEqual({ amount: 10000, count: 1 })
  })
  it('entrées = cotisations + recettes ; sorties = investissements + dépenses + retraits ; solde net = entrées − sorties', () => {
    expect(totals.inflow).toBe(81000)
    expect(totals.outflow).toBe(50000)
    expect(totals.netBalance).toBe(31000)
  })
  it('résultat commercial = recettes − dépenses − investissements, sans cotisations ni retraits', () => {
    expect(totals.commercialResult).toBe(24000 - 10000 - 30000)
  })
  it('aucun double comptage : le résultat commercial n’est pas dans les entrées', () => {
    expect(totals.inflow).toBe(totals.contributions.amount + totals.revenues.amount)
    expect(totals.netBalance).toBe(totals.contributions.amount + totals.commercialResult - totals.withdrawals.amount)
  })
  it('opérations futures ignorées et signalées', () => {
    const stats = compute()
    expect(totals.operationsCount).toBe(12)
    expect(stats.futureIgnored.count).toBe(2)
    expect(stats.notices.some((notice) => notice.code === 'FUTURE_OPERATIONS_IGNORED')).toBe(true)
  })
  it('nombre d’opérations par type, d’activités et de mois analysés', () => {
    const { counts } = compute()
    expect(counts.byType).toEqual({ CONTRIBUTION: 5, REVENUE: 2, INVESTMENT: 1, EXPENSE: 3, WITHDRAWAL: 1 })
    expect(counts.activities).toBe(3)
    expect(counts.months).toBe(2)
  })
  it('totalsOf d’une liste vide : tout à zéro', () => {
    const empty = totalsOf([])
    expect(empty.inflow + empty.outflow + empty.netBalance + empty.commercialResult + empty.operationsCount).toBe(0)
  })
})

describe('périodes', () => {
  it('« ce mois » ne contient que décembre jusqu’à aujourd’hui', () => {
    const { totals, period } = compute('month')
    expect(period.from).toBe('2026-12-01')
    expect(totals.contributions.amount).toBe(50000)
    expect(totals.revenues.amount).toBe(20000)
    expect(totals.netBalance).toBe(20000)
    expect(totals.commercialResult).toBe(20000 - 10000 - 30000)
  })

  it('bornes personnalisées incluses : une opération le jour de début et le jour de fin compte', () => {
    const { totals } = compute('custom', { from: '2026-12-05', to: '2026-12-08' })
    expect(totals.expenses.amount).toBe(5000 + 3000 + 2000)
    expect(totals.revenues.amount).toBe(20000)
    expect(totals.investments.amount).toBe(0) // 1er décembre : hors période
  })

  it('une opération n’est dans aucune de deux périodes consécutives', () => {
    const first = compute('custom', { from: '2026-12-01', to: '2026-12-07' }).totals
    const second = compute('custom', { from: '2026-12-08', to: '2026-12-20' }).totals
    const whole = compute('custom', { from: '2026-12-01', to: '2026-12-20' }).totals
    expect(first.operationsCount + second.operationsCount).toBe(whole.operationsCount)
    expect(first.netBalance + second.netBalance).toBe(whole.netBalance)
  })

  it('période sans opération : zéros, aucun mois inventé', () => {
    const stats = compute('custom', { from: '2026-12-19', to: '2026-12-19' })
    expect(stats.totals.operationsCount).toBe(0)
    expect(stats.expensesByCategory).toEqual([])
    expect(stats.activities).toEqual([])
  })

  it('période entièrement dans le futur : vide', () => {
    const stats = compute('custom', { from: '2027-02-01', to: '2027-02-10' })
    expect(stats.period.isEmpty).toBe(true)
    expect(stats.monthly).toEqual([])
    expect(stats.totals.operationsCount).toBe(0)
  })

  it('aucune donnée du tout : totaux nuls, aucun mois', () => {
    const stats = compute('all', {}, { contributions: [], operations: [], withdrawals: [] })
    expect(stats.totals.netBalance).toBe(0)
    expect(stats.monthly).toEqual([])
    expect(stats.counts.months).toBe(0)
  })
})

describe('évolution mensuelle', () => {
  const { monthly } = compute()
  it('un mois par mois entre la première opération et aujourd’hui', () => expect(monthly.map((row) => row.month)).toEqual(['2026-11', '2026-12']))
  it('chaque mois ne compte que ses opérations', () => {
    expect(monthly[0]).toEqual({ month: '2026-11', contributions: 7000, revenues: 4000, investments: 0, expenses: 0, withdrawals: 0, inflow: 11000, outflow: 0, commercialResult: 4000, netBalance: 11000 })
    expect(monthly[1].contributions).toBe(50000)
    expect(monthly[1].withdrawals).toBe(10000)
    expect(monthly[1].commercialResult).toBe(20000 - 10000 - 30000)
  })
  it('somme des mois = totaux', () => {
    expect(monthly.reduce((total, row) => total + row.netBalance, 0)).toBe(31000)
    expect(monthly.reduce((total, row) => total + row.inflow, 0)).toBe(81000)
  })
  it('un mois sans opération vaut zéro (sans document inventé)', () => {
    const stats = compute('all', {}, { contributions: [contribution(P1, 1000, '2026-10-05'), contribution(P1, 1000, '2026-12-05')], operations: [], withdrawals: [] })
    expect(stats.monthly.map((row) => row.month)).toEqual(['2026-10', '2026-11', '2026-12'])
    expect(stats.monthly[1].contributions + stats.monthly[1].netBalance).toBe(0)
  })
})

describe('dépenses par catégorie', () => {
  const { expensesByCategory } = compute()
  it('catégorie réelle de l’activité, « Non catégorisé » sinon, identifiant null', () => {
    expect(expensesByCategory.map((row) => row.label)).toEqual(['Textile', 'Cosmétique', 'Non catégorisé'])
    expect(expensesByCategory.every((row) => row.id === null)).toBe(true)
  })
  it('montants, nombres d’opérations et pourcentages', () => {
    expect(expensesByCategory.map((row) => [row.amount, row.count, row.percent])).toEqual([[5000, 1, 50], [3000, 1, 30], [2000, 1, 20]])
  })
  it('le total des catégories égale le total des dépenses', () => {
    expect(expensesByCategory.reduce((total, row) => total + row.amount, 0)).toBe(compute().totals.expenses.amount)
  })
  it('sans dépense : liste vide, pas de division par zéro', () => {
    expect(compute('all', {}, { operations: [operation(WAX, 'REVENUE', 100, '2026-12-01')] }).expensesByCategory).toEqual([])
  })
  it('plusieurs dépenses d’une même catégorie sont regroupées', () => {
    const stats = compute('all', {}, { operations: [operation(WAX, 'EXPENSE', 100, '2026-12-01'), operation(WAX, 'EXPENSE', 300, '2026-12-02')] })
    expect(stats.expensesByCategory).toEqual([{ id: null, label: 'Textile', amount: 400, count: 2, percent: 100 }])
  })
})

describe('performance des activités', () => {
  const { activities, totals } = compute()
  it('résultat = recettes − dépenses − investissements, classé du plus au moins élevé', () => {
    expect(activities.map((row) => [row.name, row.revenues, row.expenses, row.investments, row.result, row.operationsCount])).toEqual([
      ['Savon Noir', 4000, 3000, 0, 1000, 2],
      ['Sans catégorie', 0, 2000, 0, -2000, 1],
      ['Pagnes Wax', 20000, 5000, 30000, -15000, 3],
    ])
  })
  it('le résultat commercial global est la somme des résultats des activités', () => {
    expect(activities.reduce((total, row) => total + row.result, 0)).toBe(totals.commercialResult)
  })
  it('activité en cours ou suspendue : résultat provisoire ; terminée : définitif', () => {
    expect(activities.find((row) => row.name === 'Pagnes Wax').isProvisional).toBe(true)
    expect(activities.find((row) => row.name === 'Savon Noir').isProvisional).toBe(false)
  })
  it('les cotisations et retraits n’entrent dans aucune activité', () => {
    expect(activities.reduce((total, row) => total + row.operationsCount, 0)).toBe(6)
  })
  it('sur une période, seules les activités concernées apparaissent', () => {
    expect(compute('custom', { from: '2026-11-01', to: '2026-11-30' }).activities.map((row) => row.name)).toEqual(['Savon Noir'])
  })
})

describe('comparaison des associés', () => {
  const comparison = compute().contributionComparison
  const partner = (name) => comparison.partners.find((row) => row.name === name)

  it('objectif de 15 000 FCFA, identifiants réels des associés', () => {
    expect(comparison.monthlyTarget).toBe(15000)
    expect(comparison.objectiveAvailable).toBe(true)
    expect(comparison.partners.map((row) => row.partnerId)).toEqual([P1, P2])
  })

  it('montant réel jamais plafonné, pourcentage plafonné à 100 %', () => {
    const december = partner('Mohamed Bakhoum').months.find((row) => row.month === '2026-12')
    expect(december.contributed).toBe(35000)
    expect(december.percent).toBe(100)
    expect(december.remaining).toBe(0)
    expect(december.status).toBe('ACHIEVED')
  })

  it('plusieurs versements dans le mois sont additionnés', () => {
    const december = partner('Cheikh Sow').months.find((row) => row.month === '2026-12')
    expect(december.contributed).toBe(15000)
    expect(december.status).toBe('ACHIEVED')
  })

  it('avant FUND_START_PERIOD : aucun objectif, mais le montant réel est conservé', () => {
    const november = partner('Mohamed Bakhoum').months.find((row) => row.month === '2026-11')
    expect(november).toEqual({ month: '2026-11', contributed: 7000, target: null, percent: null, remaining: null, status: 'NO_OBJECTIVE', overdue: false })
  })

  it('totaux par associé : objectif uniquement sur les mois dus, opérations futures exclues', () => {
    const mohamed = partner('Mohamed Bakhoum')
    expect(mohamed.contributed).toBe(42000)
    expect(mohamed.contributionsCount).toBe(3)
    expect(mohamed.target).toBe(15000)
    expect(mohamed.settled).toBe(15000)
    expect(mohamed.percent).toBe(100)
    expect(mohamed.status).toBe('ACHIEVED')
  })

  it('versement partiel : pourcentage, reste à cotiser et mois en retard', () => {
    const stats = compute('all', {}, { contributions: [contribution(P1, 5000, '2026-12-05'), contribution(P1, 4000, '2026-12-06', '2026-12'), contribution(P2, 15000, '2026-12-05')], operations: [], withdrawals: [] })
    const mohamed = stats.contributionComparison.partners[0]
    expect(mohamed.months[0]).toEqual({ month: '2026-12', contributed: 9000, target: 15000, percent: 60, remaining: 6000, status: 'PARTIAL', overdue: false })
    expect(mohamed.status).toBe('PENDING')
    expect(stats.contributionComparison.partners[1].status).toBe('ACHIEVED')
  })

  it('un mois passé non soldé est en retard', () => {
    const stats = compute('all', {}, { contributions: [contribution(P1, 5000, '2026-12-05')], operations: [], withdrawals: [] })
    const range = resolveStatisticsRange({ period: 'all' }, '2027-02-10')
    const later = computeStatistics({ today: '2027-02-10', range, fundStartPeriod: '2026-12', monthlyTarget: 15000, partners, businesses, contributions: [contribution(P1, 5000, '2026-12-05')], operations: [], withdrawals: [] })
    expect(stats.contributionComparison.partners[0].status).toBe('PENDING')
    expect(later.contributionComparison.partners[0].status).toBe('LATE')
    expect(later.contributionComparison.partners[0].months.map((row) => row.overdue)).toEqual([true, true, false])
  })

  it('configuration absente : objectif indisponible', () => {
    const stats = compute('all', {}, { fundStartPeriod: null })
    expect(stats.contributionComparison.objectiveAvailable).toBe(false)
    expect(stats.contributionComparison.partners.every((row) => row.target === null && row.status === 'NO_OBJECTIVE')).toBe(true)
    expect(stats.notices.some((notice) => notice.code === 'OBJECTIVE_UNAVAILABLE')).toBe(true)
  })

  it('mois concerné ≠ date de versement : la comparaison suit la période (mois concerné)', () => {
    const stats = compute('all', {}, { contributions: [contribution(P1, 15000, '2026-12-03', '2026-12'), contribution(P2, 15000, '2026-12-04', '2026-11')], operations: [], withdrawals: [] })
    const [mohamed, cheikh] = stats.contributionComparison.partners
    expect(mohamed.months.find((row) => row.month === '2026-12').contributed).toBe(15000)
    expect(cheikh.months.find((row) => row.month === '2026-12').contributed).toBe(0)
    expect(stats.monthly.find((row) => row.month === '2026-12').contributions).toBe(30000) // évolution : date réelle du versement
  })
})

describe('comparaison avec la période précédente', () => {
  it('mois : période précédente équivalente, totaux à plat', () => {
    const { previousPeriod } = compute('month')
    expect(previousPeriod.from).toBe('2026-11-01')
    expect(previousPeriod.to).toBe('2026-11-20')
    expect(previousPeriod.hasMovements).toBe(true)
    expect(previousPeriod.totals.contributions).toBe(7000)
    expect(previousPeriod.totals.netBalance).toBe(7000)
  })
  it('aucune comparaison pour « toute la période »', () => expect(compute('all').previousPeriod).toBeNull())
  it('période précédente sans donnée : signalée, jamais de pourcentage inventé', () => {
    const { previousPeriod } = compute('custom', { from: '2026-12-10', to: '2026-12-14' })
    expect(previousPeriod.hasMovements).toBe(true) // 5 au 9 décembre
    const empty = compute('custom', { from: '2026-12-01', to: '2026-12-01' }).previousPeriod
    expect(empty.hasMovements).toBe(false)
    expect(empty.totals.netBalance).toBe(0)
  })
})
