// Calculs financiers du dashboard : fonctions PURES (aucune base de données, aucune horloge, aucun effet de bord).
// Le service charge les enregistrements non supprimés ; tout ce qui suit n'est que de l'arithmétique sur des entiers FCFA.
//
// Règles (aucune n'est inventée : elles découlent des modèles existants) :
// - un enregistrement non supprimé = un mouvement réel ; les modèles n'ont ni statut « annulé » ni « en attente » ;
//   la suppression logique (deletedAt) est déjà exclue en amont ;
// - un mouvement daté APRÈS aujourd'hui (Africa/Dakar) n'a pas encore eu lieu : il est ignoré et signalé ;
// - ENTRÉES de trésorerie = cotisations + recettes (REVENUE) ; SORTIES = investissements (INVESTMENT) + dépenses (EXPENSE) + retraits ;
// - trésorerie = Σ entrées − Σ sorties, cumulée depuis le début jusqu'à la fin de la période ; aucun solde initial n'existe, aucun n'est supposé ;
// - résultat d'exploitation = recettes − dépenses ; les investissements sont suivis à part (leur décaissement est déjà dans la trésorerie) ;
// - capital apporté = cotisations réellement enregistrées (jamais les attendues, jamais les recettes) ;
// - cotisations attendues = mois × cible mensuelle, à partir d'un mois de départ configuré (aucun paiement n'est supposé).

import { addDays, diffDays, firstDayOfMonth, monthOf, monthsBetween } from '../../utils/businessDates.js'

const MAX_DAILY_POINTS_DAYS = 62
const MAX_UNPAID_PERIODS_LISTED = 24
const RECENT_ACTIVITY_LIMIT = 10
const UNCATEGORIZED_LABEL = 'Non catégorisé'
const UNKNOWN_BUSINESS_LABEL = 'Activité inconnue'
const BUSINESS_STATUS_KEYS = ['ACTIVE', 'SUSPENDED', 'COMPLETED', 'ARCHIVED']

const sum = (list, pick = (item) => item.amount) => list.reduce((total, item) => total + pick(item), 0)
const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0)
const idOf = (value) => (value == null ? null : String(value))
const byAmountDesc = (a, b) => b.amount - a.amount || String(a.label).localeCompare(String(b.label), 'fr')

export function normalizeMovements({ contributions, operations, withdrawals }) {
  return [
    ...contributions.map((item) => ({
      id: idOf(item._id), kind: 'CONTRIBUTION', direction: 'IN', amount: item.amount, date: item.contributionDate,
      createdAt: item.createdAt, partnerId: idOf(item.partner), businessId: null, period: item.period,
      description: item.note || `Cotisation ${item.period}`,
    })),
    ...operations.map((item) => ({
      id: idOf(item._id), kind: item.type, direction: item.type === 'REVENUE' ? 'IN' : 'OUT', amount: item.amount, date: item.operationDate,
      createdAt: item.createdAt, partnerId: idOf(item.concernedPartner), businessId: idOf(item.business), period: null,
      description: item.description || '',
    })),
    ...withdrawals.map((item) => ({
      id: idOf(item._id), kind: 'WITHDRAWAL', direction: 'OUT', amount: item.amount, date: item.withdrawalDate,
      createdAt: item.createdAt, partnerId: idOf(item.beneficiary), businessId: null, period: null,
      description: item.reason || 'Retrait',
    })),
  ]
}

export const signed = (movement) => (movement.direction === 'IN' ? movement.amount : -movement.amount)

function buildBuckets({ from, to, granularity }) {
  const keys = []
  if (granularity === 'day') {
    for (let day = from; day <= to; day = addDays(day, 1)) keys.push(day)
  } else {
    keys.push(...monthsBetween(monthOf(from), monthOf(to)))
  }
  return keys
}

function chooseGranularity(range, from, to) {
  if (range.key === 'all' || range.key === 'year' || range.key === 'quarter') return 'month'
  return diffDays(from, to) < MAX_DAILY_POINTS_DAYS ? 'day' : 'month'
}

export function buildSeries({ movements, from, to, granularity, openingBalance, openingCapital }) {
  if (!from || from > to) return { granularity, points: [] }

  const keyOf = (date) => (granularity === 'day' ? date : monthOf(date))
  const points = new Map(
    buildBuckets({ from, to, granularity }).map((key) => [key, { key, inflow: 0, outflow: 0, revenue: 0, expense: 0, contributed: 0 }]),
  )

  for (const movement of movements) {
    const point = points.get(keyOf(movement.date))
    if (!point) continue
    if (movement.direction === 'IN') point.inflow += movement.amount
    else point.outflow += movement.amount
    if (movement.kind === 'REVENUE') point.revenue += movement.amount
    if (movement.kind === 'EXPENSE') point.expense += movement.amount
    if (movement.kind === 'CONTRIBUTION') point.contributed += movement.amount
  }

  let balance = openingBalance
  let capital = openingCapital
  const result = [...points.values()].map((point) => {
    balance += point.inflow - point.outflow
    capital += point.contributed
    return {
      key: point.key,
      inflow: point.inflow,
      outflow: point.outflow,
      net: point.inflow - point.outflow,
      balance,
      capital,
      revenue: point.revenue,
      expense: point.expense,
      result: point.revenue - point.expense,
    }
  })
  return { granularity, points: result }
}

function buildContributionsSummary({ contributions, partners, today, from, to, fundStartPeriod, monthlyTarget, cashInRange, cashToDate }) {
  const startMonth = fundStartPeriod ? (from && monthOf(from) > fundStartPeriod ? monthOf(from) : fundStartPeriod) : null
  const months = startMonth ? monthsBetween(startMonth, monthOf(to)) : []
  const expectedAvailable = fundStartPeriod != null
  const currentMonth = monthOf(today)

  const partnerRows = partners.map((partner) => {
    const own = contributions.filter((item) => idOf(item.partner) === partner.id)
    const paidByMonth = new Map(months.map((month) => [month, 0]))
    for (const item of own) if (paidByMonth.has(item.period)) paidByMonth.set(item.period, paidByMonth.get(item.period) + item.amount)

    const monthlyPaid = [...paidByMonth.entries()]
    const settled = sum(monthlyPaid, ([, paid]) => Math.min(paid, monthlyTarget))
    const paidMonths = monthlyPaid.filter(([, paid]) => paid >= monthlyTarget).length
    const partialMonths = monthlyPaid.filter(([, paid]) => paid > 0 && paid < monthlyTarget).length
    const unpaidPeriods = monthlyPaid.filter(([, paid]) => paid < monthlyTarget).map(([month]) => month)
    const expected = months.length * monthlyTarget
    const remaining = expected - settled

    let situation = 'NOT_AVAILABLE'
    if (expectedAvailable && months.length > 0) {
      if (remaining === 0) situation = 'UP_TO_DATE'
      else situation = unpaidPeriods.some((month) => month < currentMonth) ? 'LATE' : 'PENDING'
    } else if (expectedAvailable) situation = 'NO_MONTH_DUE'

    return {
      partnerId: partner.id,
      name: partner.name,
      partnerNumber: partner.partnerNumber,
      monthlyTarget,
      paidInPeriod: cashInRange.get(partner.id) ?? 0,
      paidToDate: cashToDate.get(partner.id) ?? 0,
      expected: expectedAvailable ? expected : null,
      settled: expectedAvailable ? settled : null,
      remaining: expectedAvailable ? remaining : null,
      realizationRate: expectedAvailable ? percent(settled, expected) : null,
      paidMonths: expectedAvailable ? paidMonths : null,
      unpaidMonths: expectedAvailable ? months.length - paidMonths : null,
      partialMonths: expectedAvailable ? partialMonths : null,
      unpaidPeriods: expectedAvailable ? unpaidPeriods.slice(-MAX_UNPAID_PERIODS_LISTED) : [],
      situation,
    }
  })

  const expectedTotal = sum(partnerRows, (row) => row.expected ?? 0)
  const settledTotal = sum(partnerRows, (row) => row.settled ?? 0)
  return {
    monthlyTargetPerPartner: monthlyTarget,
    expectedAvailable,
    unavailableReason: expectedAvailable ? null : "La date de début du fonds n'est pas configurée (FUND_START_PERIOD) : les cotisations attendues ne peuvent pas être calculées.",
    monthsCount: months.length,
    expected: expectedAvailable ? expectedTotal : null,
    settled: expectedAvailable ? settledTotal : null,
    remaining: expectedAvailable ? expectedTotal - settledTotal : null,
    realizationRate: expectedAvailable ? percent(settledTotal, expectedTotal) : null,
    partners: partnerRows,
  }
}

/**
 * @param {object} input
 * @param {string} input.today « AAAA-MM-JJ » (Africa/Dakar)
 * @param {{ key: string, label: string, from: string | null, to: string }} input.range
 * @param {string | null} input.fundStartPeriod « AAAA-MM » ou null
 * @param {number} input.monthlyTarget cotisation mensuelle par associé (FCFA)
 * @param {Array<{ id: string, name: string, partnerNumber: number }>} input.partners
 * @param {Array} input.businesses { _id, name, category, status }
 * @param {Array} input.contributions { _id, partner, amount, contributionDate, period, note, createdAt }
 * @param {Array} input.operations { _id, business, type, amount, operationDate, description, concernedPartner, createdAt }
 * @param {Array} input.withdrawals { _id, beneficiary, amount, withdrawalDate, reason, createdAt }
 */
export function computeDashboard({ today, range, fundStartPeriod = null, monthlyTarget, partners, businesses, contributions, operations, withdrawals }) {
  const to = range.to < today ? range.to : today
  const from = range.from
  const allMovements = normalizeMovements({ contributions, operations, withdrawals })
  const realized = allMovements.filter((movement) => movement.date <= today) // le futur n'a pas encore eu lieu
  const ignoredFutureDated = allMovements.length - realized.length

  const inRange = (movement) => (from == null || movement.date >= from) && movement.date <= to
  const periodMovements = from != null && from > to ? [] : realized.filter(inRange)
  const ofKind = (kind) => periodMovements.filter((movement) => movement.kind === kind)

  const businessById = new Map(businesses.map((business) => [idOf(business._id), business]))
  const partnerById = new Map(partners.map((partner) => [partner.id, partner]))

  // --- Totaux de la période ---
  const contributionMoves = ofKind('CONTRIBUTION')
  const revenueMoves = ofKind('REVENUE')
  const expenseMoves = ofKind('EXPENSE')
  const investmentMoves = ofKind('INVESTMENT')
  const withdrawalMoves = ofKind('WITHDRAWAL')

  const totals = {
    contributions: { amount: sum(contributionMoves), count: contributionMoves.length },
    revenues: { amount: sum(revenueMoves), count: revenueMoves.length },
    expenses: { amount: sum(expenseMoves), count: expenseMoves.length },
    investments: { amount: sum(investmentMoves), count: investmentMoves.length },
    withdrawals: { amount: sum(withdrawalMoves), count: withdrawalMoves.length },
  }
  const inflow = totals.contributions.amount + totals.revenues.amount
  const outflow = totals.investments.amount + totals.expenses.amount + totals.withdrawals.amount

  // --- Trésorerie : cumul depuis le début jusqu'à la fin de la période ---
  const upToEnd = realized.filter((movement) => movement.date <= to)
  const beforeStart = from == null ? [] : realized.filter((movement) => movement.date < from)
  const balance = sum(upToEnd, signed)
  const openingBalance = sum(beforeStart, signed)

  // --- Résultat d'exploitation (hors investissements) ---
  const operatingResult = totals.revenues.amount - totals.expenses.amount
  // Une activité suspendue peut reprendre : le résultat reste provisoire tant qu'une activité est active OU suspendue.
  const hasRunningBusiness = businesses.some((business) => business.status === 'ACTIVE' || business.status === 'SUSPENDED')

  // --- Capital apporté ---
  const cashInRange = new Map()
  const cashToDate = new Map()
  for (const movement of upToEnd) {
    if (movement.kind !== 'CONTRIBUTION') continue
    cashToDate.set(movement.partnerId, (cashToDate.get(movement.partnerId) ?? 0) + movement.amount)
    if (inRange(movement)) cashInRange.set(movement.partnerId, (cashInRange.get(movement.partnerId) ?? 0) + movement.amount)
  }
  const capitalToDate = sum(upToEnd.filter((movement) => movement.kind === 'CONTRIBUTION'))
  const capitalByPartner = partners.map((partner) => ({
    partnerId: partner.id,
    name: partner.name,
    partnerNumber: partner.partnerNumber,
    amount: cashToDate.get(partner.id) ?? 0,
    sharePercent: percent(cashToDate.get(partner.id) ?? 0, capitalToDate),
  }))

  // --- Cotisations attendues / versées ---
  const activeContributions = contributions.filter((item) => item.contributionDate <= today)
  const contributionsSummary = buildContributionsSummary({
    contributions: activeContributions, partners, today, from, to, fundStartPeriod, monthlyTarget, cashInRange, cashToDate,
  })

  // --- Investissements ---
  const investmentsByBusinessMap = new Map()
  for (const movement of investmentMoves) {
    const business = businessById.get(movement.businessId)
    const entry = investmentsByBusinessMap.get(movement.businessId) ?? {
      businessId: movement.businessId,
      label: business?.name ?? UNKNOWN_BUSINESS_LABEL,
      category: business?.category ?? null,
      status: business?.status ?? null,
      amount: 0,
      count: 0,
    }
    entry.amount += movement.amount
    entry.count += 1
    investmentsByBusinessMap.set(movement.businessId, entry)
  }
  const investmentsByBusiness = [...investmentsByBusinessMap.values()].sort(byAmountDesc)
  const investmentsByStatus = Object.fromEntries(
    BUSINESS_STATUS_KEYS.map((status) => {
      const rows = investmentsByBusiness.filter((row) => row.status === status)
      return [status, { businesses: rows.length, amount: sum(rows) }]
    }),
  )

  // --- Dépenses et recettes : par catégorie d'activité / par activité ---
  const expensesByCategoryMap = new Map()
  for (const movement of expenseMoves) {
    const category = businessById.get(movement.businessId)?.category || UNCATEGORIZED_LABEL
    const entry = expensesByCategoryMap.get(category) ?? { label: category, amount: 0, count: 0 }
    entry.amount += movement.amount
    entry.count += 1
    expensesByCategoryMap.set(category, entry)
  }
  const revenuesByBusinessMap = new Map()
  for (const movement of revenueMoves) {
    const business = businessById.get(movement.businessId)
    const entry = revenuesByBusinessMap.get(movement.businessId) ?? { businessId: movement.businessId, label: business?.name ?? UNKNOWN_BUSINESS_LABEL, amount: 0, count: 0 }
    entry.amount += movement.amount
    entry.count += 1
    revenuesByBusinessMap.set(movement.businessId, entry)
  }

  // « Du mois » : toujours le mois en cours, quel que soit le filtre.
  const monthStart = firstDayOfMonth(monthOf(today))
  const thisMonth = (kind) => sum(realized.filter((movement) => movement.kind === kind && movement.date >= monthStart))

  // --- Évolution (graphique) ---
  const earliest = realized.length > 0 ? realized.reduce((min, movement) => (movement.date < min ? movement.date : min), realized[0].date) : null
  const seriesFrom = from ?? earliest
  const granularity = seriesFrom && seriesFrom <= to ? chooseGranularity(range, seriesFrom, to) : 'month'
  const series = buildSeries({
    movements: periodMovements,
    from: seriesFrom,
    to,
    granularity,
    openingBalance,
    openingCapital: sum(beforeStart.filter((movement) => movement.kind === 'CONTRIBUTION')),
  })

  // --- Activités récentes (les 10 dernières, indépendamment du filtre) ---
  const recentActivities = [...realized]
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')) || b.id.localeCompare(a.id))
    .slice(0, RECENT_ACTIVITY_LIMIT)
    .map((movement) => {
      const partner = partnerById.get(movement.partnerId)
      return {
        id: movement.id,
        kind: movement.kind,
        direction: movement.direction,
        description: movement.description,
        amount: movement.amount,
        date: movement.date,
        partner: partner ? { id: partner.id, name: partner.name, partnerNumber: partner.partnerNumber } : null,
        businessName: movement.businessId ? (businessById.get(movement.businessId)?.name ?? UNKNOWN_BUSINESS_LABEL) : null,
        status: 'RECORDED', // les modèles n'ont pas d'autre statut : tout enregistrement non supprimé est effectif
      }
    })

  // --- Avertissements honnêtes sur la fiabilité ---
  const notices = [
    {
      code: 'NO_INITIAL_BALANCE',
      level: 'info',
      message: "La trésorerie est calculée uniquement à partir des mouvements enregistrés : aucun solde initial n'est défini.",
    },
  ]
  if (!contributionsSummary.expectedAvailable) {
    notices.push({ code: 'EXPECTED_CONTRIBUTIONS_UNAVAILABLE', level: 'warning', message: contributionsSummary.unavailableReason })
  }
  if (hasRunningBusiness) {
    notices.push({ code: 'RESULT_PROVISIONAL', level: 'info', message: "Le résultat est provisoire : au moins une activité est encore en cours ou suspendue, des opérations peuvent encore être enregistrées." })
  }
  if (balance < 0) {
    notices.push({ code: 'NEGATIVE_TREASURY', level: 'warning', message: 'La trésorerie calculée est négative : des mouvements sont probablement manquants ou mal enregistrés.' })
  }
  if (ignoredFutureDated > 0) {
    notices.push({ code: 'FUTURE_DATED_IGNORED', level: 'info', message: `${ignoredFutureDated} mouvement(s) daté(s) après aujourd'hui ne sont pas comptés.` })
  }

  return {
    period: { key: range.key, label: range.label, from, to, granularity: series.granularity },
    today,
    hasAnyData: allMovements.length > 0 || businesses.length > 0,
    overview: {
      inflow,
      outflow,
      net: inflow - outflow,
      contributions: totals.contributions,
      revenues: totals.revenues,
      expenses: totals.expenses,
      investments: totals.investments,
      withdrawals: totals.withdrawals,
    },
    treasury: {
      balance,
      openingBalance,
      periodNet: inflow - outflow,
      inflow,
      outflow,
      asOf: to,
      initialBalanceDefined: false,
      committedAmount: null, // aucun modèle d'engagement n'existe : on ne l'invente pas
    },
    capital: { totalToDate: capitalToDate, periodContributions: totals.contributions.amount, byPartner: capitalByPartner },
    contributions: contributionsSummary,
    investments: {
      total: totals.investments.amount,
      count: totals.investments.count,
      byStatus: investmentsByStatus,
      byBusiness: investmentsByBusiness,
    },
    expenses: {
      total: totals.expenses.amount,
      count: totals.expenses.count,
      thisMonth: thisMonth('EXPENSE'),
      byCategory: [...expensesByCategoryMap.values()].sort(byAmountDesc),
    },
    revenues: {
      total: totals.revenues.amount,
      count: totals.revenues.count,
      thisMonth: thisMonth('REVENUE'),
      byBusiness: [...revenuesByBusinessMap.values()].sort(byAmountDesc),
    },
    result: {
      revenues: totals.revenues.amount,
      expenses: totals.expenses.amount,
      amount: operatingResult,
      kind: operatingResult > 0 ? 'PROFIT' : operatingResult < 0 ? 'LOSS' : 'BREAK_EVEN',
      isProvisional: hasRunningBusiness,
    },
    charts: {
      evolution: series,
      investmentsByBusiness: investmentsByBusiness.map(({ label, amount, count }) => ({ label, amount, count })),
      expensesByCategory: [...expensesByCategoryMap.values()].sort(byAmountDesc),
      contributionsByPartner: capitalByPartner.map(({ name, amount }) => ({ label: name, amount })),
    },
    recentActivities,
    notices,
    ignoredFutureDated,
  }
}
