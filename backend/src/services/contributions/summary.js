
import { monthOf, monthsBetween } from '../../utils/businessDates.js'

const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null)
const sum = (values) => values.reduce((total, value) => total + value, 0)
const idOf = (value) => (value == null ? null : String(value))

function partnerMonthStatus(paid, target) {
  if (paid >= target) return 'PAID'
  return paid > 0 ? 'PARTIAL' : 'UNPAID'
}

/**
 * @param {object} input
 * @param {string} input.today « AAAA-MM-JJ »
 * @param {string | null} input.fundStartPeriod « AAAA-MM » ou null
 * @param {number} input.monthlyTarget objectif mensuel par associé (FCFA)
 * @param {Array<{ id: string, name: string, partnerNumber: number }>} input.partners
 * @param {Array<{ partner: unknown, amount: number, period: string, contributionDate: string }>} input.contributions non supprimées
 */
export function computeContributionSummary({ today, fundStartPeriod = null, monthlyTarget, partners, contributions }) {
  const currentPeriod = monthOf(today)
  const effective = contributions.filter((item) => item.contributionDate <= today)
  const expectedAvailable = fundStartPeriod != null
  const dueMonths = expectedAvailable ? monthsBetween(fundStartPeriod, currentPeriod) : []
  const fundStarted = dueMonths.length > 0

  const paidBy = new Map(partners.map((partner) => [partner.id, new Map()]))
  const counts = new Map(partners.map((partner) => [partner.id, 0]))
  for (const item of effective) {
    const partnerId = idOf(item.partner)
    const months = paidBy.get(partnerId)
    if (!months) continue // associé inconnu : jamais rattaché à un autre
    months.set(item.period, (months.get(item.period) ?? 0) + item.amount)
    counts.set(partnerId, counts.get(partnerId) + 1)
  }

  const partnerRows = partners.map((partner) => {
    const months = paidBy.get(partner.id)
    const paid = sum([...months.values()])
    const monthly = dueMonths.map((period) => months.get(period) ?? 0)
    const paidForDueMonths = sum(monthly)
    const settled = sum(monthly.map((value) => Math.min(value, monthlyTarget)))
    const excess = sum(monthly.map((value) => Math.max(0, value - monthlyTarget)))
    const expected = expectedAvailable ? dueMonths.length * monthlyTarget : null
    return {
      partnerId: partner.id,
      name: partner.name,
      partnerNumber: partner.partnerNumber,
      monthlyTarget,
      contributionsCount: counts.get(partner.id),
      paid, // réel, intégral
      paidForDueMonths,
      paidOutsideDueMonths: paid - paidForDueMonths,
      expected,
      settled: expectedAvailable ? settled : null,
      remaining: expectedAvailable ? expected - settled : null,
      excess: expectedAvailable ? excess : null,
      realizationRate: expectedAvailable ? percent(settled, expected) : null,
      monthsCount: dueMonths.length,
      paidMonths: expectedAvailable ? monthly.filter((value) => value >= monthlyTarget).length : null,
      partialMonths: expectedAvailable ? monthly.filter((value) => value > 0 && value < monthlyTarget).length : null,
      unpaidMonths: expectedAvailable ? monthly.filter((value) => value < monthlyTarget).length : null,
      overdueMonths: expectedAvailable ? dueMonths.filter((period, index) => period < currentPeriod && monthly[index] < monthlyTarget) : [],
    }
  })

  const months = dueMonths.map((period) => {
    const rows = partnerRows.map((row) => {
      const paid = paidBy.get(row.partnerId).get(period) ?? 0
      return { partnerId: row.partnerId, paid, settled: Math.min(paid, monthlyTarget), status: partnerMonthStatus(paid, monthlyTarget) }
    })
    const target = monthlyTarget * partners.length
    const settled = sum(rows.map((row) => row.settled))
    return {
      period,
      isCurrent: period === currentPeriod,
      target,
      paid: sum(rows.map((row) => row.paid)),
      settled,
      remaining: target - settled,
      isComplete: settled === target,
      isOverdue: period < currentPeriod && settled < target,
      partners: rows,
    }
  })

  const paid = sum(partnerRows.map((row) => row.paid))
  const expected = expectedAvailable ? sum(partnerRows.map((row) => row.expected)) : null
  const settled = expectedAvailable ? sum(partnerRows.map((row) => row.settled)) : null

  return {
    fundStartPeriod,
    currentPeriod,
    expectedAvailable,
    fundStarted,
    unavailableReason: expectedAvailable ? null : "La date de début du fonds n'est pas configurée (FUND_START_PERIOD) : les objectifs ne peuvent pas être calculés.",
    monthlyTargetPerPartner: monthlyTarget,
    monthlyTargetCollective: monthlyTarget * partners.length,
    monthsCount: dueMonths.length,
    partners: partnerRows,
    collective: {
      paid, // total cumulé réellement encaissé
      contributionsCount: sum(partnerRows.map((row) => row.contributionsCount)),
      expected,
      objective: expected,
      settled,
      remaining: expectedAvailable ? expected - settled : null,
      excess: expectedAvailable ? sum(partnerRows.map((row) => row.excess)) : null,
      realizationRate: expectedAvailable ? percent(settled, expected) : null,
    },
    months,
  }
}
