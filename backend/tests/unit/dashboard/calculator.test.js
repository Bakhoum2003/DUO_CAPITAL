import { describe, expect, it } from 'vitest'
import { resolvePeriodRange } from '../../../src/utils/businessDates.js'
import { computeDashboard } from '../../../src/services/dashboard/calculator.js'

const TODAY = '2026-11-14'
const MOHAMED = { id: 'u1', name: 'Mohamed Bakhoum', partnerNumber: 1 }
const CHEIKH = { id: 'u2', name: 'Cheikh Sow', partnerNumber: 2 }

let counter = 0
const nextId = () => `id${String(++counter).padStart(4, '0')}`
const contribution = (partner, amount, date, period = date.slice(0, 7)) => ({ _id: nextId(), partner, amount, contributionDate: date, period, note: null, createdAt: `${date}T08:00:00.000Z` })
const operation = (type, business, amount, date, extra = {}) => ({ _id: nextId(), type, business, amount, operationDate: date, description: `${type} ${amount}`, concernedPartner: null, createdAt: `${date}T09:00:00.000Z`, ...extra })
const withdrawal = (beneficiary, amount, date) => ({ _id: nextId(), beneficiary, amount, withdrawalDate: date, reason: 'Retrait', createdAt: `${date}T10:00:00.000Z` })
const business = (id, name, status = 'ACTIVE', category = null) => ({ _id: id, name, status, category })

function compute({ period = 'all', from, to, fundStartPeriod = null, contributions = [], operations = [], withdrawals = [], businesses = [] } = {}) {
  return computeDashboard({
    today: TODAY,
    range: resolvePeriodRange({ period, from, to }, TODAY),
    fundStartPeriod,
    monthlyTarget: 15000,
    partners: [MOHAMED, CHEIKH],
    businesses,
    contributions,
    operations,
    withdrawals,
  })
}

describe('dashboard : base vide', () => {
  it('aucune donnée : des zéros vrais, hasAnyData faux, rien de NaN, aucune activité inventée', () => {
    const data = compute()
    expect(data.hasAnyData).toBe(false)
    expect(data.treasury.balance).toBe(0)
    expect(data.capital.totalToDate).toBe(0)
    expect(data.overview).toMatchObject({ inflow: 0, outflow: 0, net: 0 })
    expect(data.recentActivities).toEqual([])
    expect(data.charts.evolution.points).toEqual([])
    expect(JSON.stringify(data)).not.toContain('NaN')
  })
})

describe('dashboard : capital et cotisations versées', () => {
  it('le capital = cotisations réellement enregistrées, par associé, avec la répartition', () => {
    const data = compute({ contributions: [contribution('u1', 15000, '2026-10-05'), contribution('u1', 15000, '2026-11-05'), contribution('u2', 15000, '2026-11-06')] })
    expect(data.capital.totalToDate).toBe(45000)
    expect(data.capital.byPartner.map((p) => [p.name, p.amount, p.sharePercent])).toEqual([
      ['Mohamed Bakhoum', 30000, 66.7],
      ['Cheikh Sow', 15000, 33.3],
    ])
    expect(data.charts.contributionsByPartner).toEqual([{ label: 'Mohamed Bakhoum', amount: 30000 }, { label: 'Cheikh Sow', amount: 15000 }])
  })

  it('les recettes ne sont jamais du capital', () => {
    const data = compute({ businesses: [business('b1', 'A')], operations: [operation('REVENUE', 'b1', 80000, '2026-11-05')] })
    expect(data.capital.totalToDate).toBe(0)
    expect(data.treasury.balance).toBe(80000)
  })
})

describe('dashboard : cotisations attendues', () => {
  const settledContributions = [
    contribution('u1', 15000, '2026-09-03'), contribution('u1', 15000, '2026-10-03'), contribution('u1', 15000, '2026-11-03'),
    contribution('u2', 15000, '2026-09-04'), contribution('u2', 7000, '2026-10-04'),
  ]

  it('sans mois de départ configuré : aucun montant attendu inventé, avertissement, versements affichés', () => {
    const data = compute({ contributions: settledContributions })
    expect(data.contributions.expectedAvailable).toBe(false)
    expect(data.contributions.expected).toBeNull()
    expect(data.contributions.partners[0]).toMatchObject({ expected: null, remaining: null, situation: 'NOT_AVAILABLE', paidToDate: 45000 })
    expect(data.notices.map((n) => n.code)).toContain('EXPECTED_CONTRIBUTIONS_UNAVAILABLE')
  })

  it('attendu = mois × 15 000 ; mois payés, partiels, restant, taux, retard', () => {
    const data = compute({ fundStartPeriod: '2026-09', contributions: settledContributions })
    expect(data.contributions).toMatchObject({ monthsCount: 3, expected: 90000, settled: 67000, remaining: 23000, realizationRate: 74.4 })
    const [mohamed, cheikh] = data.contributions.partners
    expect(mohamed).toMatchObject({ expected: 45000, settled: 45000, remaining: 0, paidMonths: 3, unpaidMonths: 0, situation: 'UP_TO_DATE' })
    expect(cheikh).toMatchObject({ expected: 45000, settled: 22000, remaining: 23000, paidMonths: 1, partialMonths: 1, unpaidMonths: 2, situation: 'LATE' })
    expect(cheikh.unpaidPeriods).toEqual(['2026-10', '2026-11'])
  })

  it("un mois non payé n'est jamais supposé payé : aucune cotisation = tout restant dû", () => {
    const data = compute({ fundStartPeriod: '2026-10' })
    expect(data.contributions.expected).toBe(60000)
    expect(data.contributions.remaining).toBe(60000)
    expect(data.capital.totalToDate).toBe(0)
  })

  it("seul le mois en cours impayé : situation « en attente », pas « en retard »", () => {
    const data = compute({ fundStartPeriod: '2026-11', contributions: [contribution('u1', 15000, '2026-11-02')] })
    expect(data.contributions.partners[1].situation).toBe('PENDING')
    expect(data.contributions.partners[0].situation).toBe('UP_TO_DATE')
  })

  it("un excédent sur un mois ne compense pas un autre mois", () => {
    const data = compute({ fundStartPeriod: '2026-09', contributions: [contribution('u1', 45000, '2026-09-03', '2026-09')] })
    expect(data.contributions.partners[0]).toMatchObject({ settled: 15000, remaining: 30000, paidMonths: 1 })
    expect(data.capital.byPartner[0].amount).toBe(45000) // l'argent est bien versé : c'est du capital
  })

  it('une cotisation en retard (date récente, période ancienne) règle la période concernée', () => {
    const data = compute({ fundStartPeriod: '2026-09', contributions: [contribution('u2', 15000, '2026-11-10', '2026-09')] })
    expect(data.contributions.partners[1]).toMatchObject({ settled: 15000, paidMonths: 1 })
  })
})

describe('dashboard : trésorerie, résultat, double comptage', () => {
  const businesses = [business('b1', 'Boissons', 'ACTIVE', 'Alimentation')]
  const data = compute({
    businesses,
    contributions: [contribution('u1', 15000, '2026-11-01'), contribution('u2', 15000, '2026-11-01')],
    operations: [operation('REVENUE', 'b1', 50000, '2026-11-05'), operation('INVESTMENT', 'b1', 20000, '2026-11-02'), operation('EXPENSE', 'b1', 5000, '2026-11-06')],
    withdrawals: [withdrawal('u1', 10000, '2026-11-08')],
  })

  it('trésorerie = (cotisations + recettes) − (investissements + dépenses + retraits)', () => {
    expect(data.treasury.balance).toBe(30000 + 50000 - (20000 + 5000 + 10000))
    expect(data.treasury).toMatchObject({ initialBalanceDefined: false, committedAmount: null })
    expect(data.overview).toMatchObject({ inflow: 80000, outflow: 35000, net: 45000 })
  })

  it("résultat d'exploitation = recettes − dépenses ; l'investissement n'est PAS déduit une seconde fois", () => {
    expect(data.result).toMatchObject({ revenues: 50000, expenses: 5000, amount: 45000, kind: 'PROFIT', isProvisional: true })
    expect(data.investments).toMatchObject({ total: 20000, count: 1 })
  })

  it('la trésorerie n\'est pas « capital + recettes + bénéfices »', () => {
    const naive = data.capital.totalToDate + data.revenues.total + data.result.amount
    expect(data.treasury.balance).not.toBe(naive)
  })

  it('une perte et un résultat nul sont distingués', () => {
    const loss = compute({ businesses, operations: [operation('EXPENSE', 'b1', 3000, '2026-11-05')] })
    expect(loss.result).toMatchObject({ amount: -3000, kind: 'LOSS' })
    expect(compute().result.kind).toBe('BREAK_EVEN')
  })

  it('résultat définitif seulement si plus aucune activité n\'est en cours', () => {
    const done = compute({ businesses: [business('b1', 'A', 'COMPLETED')], operations: [operation('REVENUE', 'b1', 1000, '2026-11-05')] })
    expect(done.result.isProvisional).toBe(false)
    expect(done.notices.map((n) => n.code)).not.toContain('RESULT_PROVISIONAL')
    expect(data.notices.map((n) => n.code)).toContain('RESULT_PROVISIONAL')
  })

  it('une activité suspendue garde le résultat provisoire et ses investissements restent comptés par statut', () => {
    const suspended = compute({
      businesses: [business('b1', 'A', 'SUSPENDED')],
      operations: [operation('INVESTMENT', 'b1', 10000, '2026-11-05'), operation('REVENUE', 'b1', 4000, '2026-11-06')],
    })
    expect(suspended.result.isProvisional).toBe(true)
    expect(suspended.investments.byStatus.SUSPENDED).toEqual({ businesses: 1, amount: 10000 })
    expect(suspended.treasury.balance).toBe(4000 - 10000) // la trésorerie ne dépend jamais du statut
  })

  it('trésorerie négative signalée (jamais masquée)', () => {
    const negative = compute({ businesses, operations: [operation('EXPENSE', 'b1', 3000, '2026-11-05')] })
    expect(negative.treasury.balance).toBe(-3000)
    expect(negative.notices.map((n) => n.code)).toContain('NEGATIVE_TREASURY')
  })

  it('le solde initial n\'est jamais supposé (avertissement permanent)', () => {
    expect(data.notices.map((n) => n.code)).toContain('NO_INITIAL_BALANCE')
  })
})

describe('dashboard : mouvements futurs', () => {
  it("un mouvement daté après aujourd'hui n'est compté nulle part et il est signalé", () => {
    const data = compute({
      businesses: [business('b1', 'A')],
      contributions: [contribution('u1', 15000, '2026-11-14'), contribution('u1', 15000, '2026-12-05')],
      operations: [operation('REVENUE', 'b1', 99000, '2026-11-20')],
    })
    expect(data.treasury.balance).toBe(15000)
    expect(data.capital.totalToDate).toBe(15000)
    expect(data.revenues.total).toBe(0)
    expect(data.ignoredFutureDated).toBe(2)
    expect(data.notices.map((n) => n.code)).toContain('FUTURE_DATED_IGNORED')
    expect(data.recentActivities).toHaveLength(1)
  })
})

describe('dashboard : filtres temporels', () => {
  const fixtures = {
    businesses: [business('b1', 'A')],
    contributions: [contribution('u1', 15000, '2026-10-05'), contribution('u1', 15000, '2026-11-05')],
    operations: [operation('REVENUE', 'b1', 40000, '2026-11-10'), operation('REVENUE', 'b1', 10000, '2026-10-20'), operation('EXPENSE', 'b1', 4000, '2026-11-14')],
  }

  it('« ce mois » : totaux du mois ; trésorerie cumulée depuis le début avec solde d\'ouverture', () => {
    const data = compute({ ...fixtures, period: 'month' })
    expect(data.overview.contributions.amount).toBe(15000)
    expect(data.revenues.total).toBe(40000)
    expect(data.treasury).toMatchObject({ openingBalance: 25000, balance: 25000 + 15000 + 40000 - 4000, periodNet: 51000 })
    expect(data.period).toMatchObject({ from: '2026-11-01', to: '2026-11-14' }) // plafonné à aujourd'hui
  })

  it('« aujourd\'hui » : seulement le jour', () => {
    const data = compute({ ...fixtures, period: 'today' })
    expect(data.expenses.total).toBe(4000)
    expect(data.revenues.total).toBe(0)
    expect(data.charts.evolution.points).toHaveLength(1)
  })

  it('« depuis le début » : tout, évolution mensuelle cumulative', () => {
    const data = compute({ ...fixtures })
    expect(data.revenues.total).toBe(50000)
    const points = data.charts.evolution.points
    expect(data.charts.evolution.granularity).toBe('month')
    expect(points.map((p) => p.key)).toEqual(['2026-10', '2026-11'])
    expect(points[0]).toMatchObject({ inflow: 25000, outflow: 0, balance: 25000, capital: 15000 })
    expect(points[1]).toMatchObject({ inflow: 55000, outflow: 4000, balance: 76000, capital: 30000, result: 36000 })
  })

  it('« cette semaine » : points journaliers du lundi à aujourd\'hui', () => {
    const data = compute({ ...fixtures, period: 'week' })
    expect(data.charts.evolution.granularity).toBe('day')
    expect(data.charts.evolution.points.map((p) => p.key)).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14'])
  })

  it('période personnalisée dans le passé', () => {
    const data = compute({ ...fixtures, period: 'custom', from: '2026-10-01', to: '2026-10-31' })
    expect(data.revenues.total).toBe(10000)
    expect(data.treasury.balance).toBe(25000) // au 31 octobre
    expect(data.treasury.asOf).toBe('2026-10-31')
  })

  it('période entièrement dans le futur : vide, sans erreur', () => {
    const data = compute({ ...fixtures, period: 'custom', from: '2027-01-01', to: '2027-01-31' })
    expect(data.overview.inflow).toBe(0)
    expect(data.charts.evolution.points).toEqual([])
    expect(JSON.stringify(data)).not.toContain('NaN')
  })

  it('« dépenses / recettes du mois » ignorent le filtre', () => {
    const data = compute({ ...fixtures, period: 'custom', from: '2026-10-01', to: '2026-10-31' })
    expect(data.revenues.thisMonth).toBe(40000)
    expect(data.expenses.thisMonth).toBe(4000)
  })
})

describe('dashboard : investissements, dépenses, recettes', () => {
  const businesses = [business('b1', 'Boissons', 'ACTIVE', 'Alimentation'), business('b2', 'T-shirts', 'COMPLETED', 'Textile'), business('b3', 'Ancien', 'ARCHIVED')]
  const operations = [
    operation('INVESTMENT', 'b1', 60000, '2026-11-01'), operation('INVESTMENT', 'b1', 10000, '2026-11-02'), operation('INVESTMENT', 'b2', 45000, '2026-10-02'),
    operation('EXPENSE', 'b1', 4000, '2026-11-03'), operation('EXPENSE', 'b2', 6000, '2026-11-04'), operation('EXPENSE', 'b3', 1000, '2026-11-04'), operation('EXPENSE', 'inconnu', 500, '2026-11-04'),
    operation('REVENUE', 'b1', 30000, '2026-11-05'), operation('REVENUE', 'b2', 20000, '2026-11-06'),
  ]
  const data = compute({ businesses, operations })

  it('investissements par activité (triés) et par statut d\'activité', () => {
    expect(data.investments).toMatchObject({ total: 115000, count: 3 })
    expect(data.investments.byBusiness.map((row) => [row.label, row.amount, row.count])).toEqual([['Boissons', 70000, 2], ['T-shirts', 45000, 1]])
    expect(data.investments.byStatus).toEqual({ ACTIVE: { businesses: 1, amount: 70000 }, SUSPENDED: { businesses: 0, amount: 0 }, COMPLETED: { businesses: 1, amount: 45000 }, ARCHIVED: { businesses: 0, amount: 0 } })
    expect(data.charts.investmentsByBusiness[0]).toEqual({ label: 'Boissons', amount: 70000, count: 2 })
  })

  it("dépenses par catégorie d'activité (« Non catégorisé » à défaut) et totaux", () => {
    expect(data.expenses).toMatchObject({ total: 11500, count: 4 })
    expect(data.expenses.byCategory.map((row) => [row.label, row.amount])).toEqual([['Textile', 6000], ['Alimentation', 4000], ['Non catégorisé', 1500]])
  })

  it('recettes par activité', () => {
    expect(data.revenues).toMatchObject({ total: 50000, count: 2 })
    expect(data.revenues.byBusiness.map((row) => [row.label, row.amount])).toEqual([['Boissons', 30000], ['T-shirts', 20000]])
  })

  it('aucun double comptage : chaque enregistrement n\'apparaît que dans sa catégorie', () => {
    const total = data.investments.total + data.expenses.total + data.revenues.total
    expect(total).toBe(sumOf(operations))
    expect(data.overview.outflow).toBe(data.investments.total + data.expenses.total)
    expect(data.overview.inflow).toBe(data.revenues.total)
  })
})

function sumOf(items) {
  return items.reduce((total, item) => total + item.amount, 0)
}

describe('dashboard : activités récentes', () => {
  it('dix dernières, de la plus récente à la plus ancienne, avec associé, type et statut', () => {
    const contributions = Array.from({ length: 12 }, (_, i) => contribution(i % 2 ? 'u2' : 'u1', 1000 + i, `2026-11-${String(i + 1).padStart(2, '0')}`))
    const data = compute({ contributions, businesses: [business('b1', 'A')], operations: [operation('EXPENSE', 'b1', 700, '2026-11-14', { concernedPartner: 'u2' })] })
    expect(data.recentActivities).toHaveLength(10)
    const dates = data.recentActivities.map((a) => a.date)
    expect(dates).toEqual([...dates].sort().reverse())
    expect(data.recentActivities[0]).toMatchObject({ kind: 'EXPENSE', direction: 'OUT', amount: 700, status: 'RECORDED', businessName: 'A' })
    expect(data.recentActivities[0].partner.name).toBe('Cheikh Sow')
    expect(data.recentActivities[0].partner.partnerNumber).toBe(2)
    expect(data.recentActivities.find((a) => a.kind === 'CONTRIBUTION').partner === null).toBe(false)
  })
})
