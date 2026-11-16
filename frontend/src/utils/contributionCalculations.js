import { formatMonthLabel, formatNumber, formatShortDate } from './formatters'


export function getMonthKey(isoDate) {
  return isoDate.slice(0, 7)
}

export function getTodayIsoDate(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function shiftMonthKey(monthKey, offset) {
  const [year, month] = monthKey.split('-').map(Number)
  const shifted = new Date(year, month - 1 + offset, 1)
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`
}

export function getMonthBounds(contributions, currentMonthKey) {
  const monthKeys = [...contributions.map((contribution) => getMonthKey(contribution.date)), currentMonthKey].sort()
  return { first: monthKeys[0], last: monthKeys[monthKeys.length - 1] }
}

export function clampMonthKey(monthKey, first, last) {
  if (monthKey < first) return first
  if (monthKey > last) return last
  return monthKey
}

export function getMonthOptions(contributions) {
  const monthKeys = [...new Set(contributions.map((contribution) => getMonthKey(contribution.date)))]
  return monthKeys.sort().reverse().map((monthKey) => ({ value: monthKey, label: formatMonthLabel(monthKey) }))
}

export function sumAmounts(contributions) {
  return contributions.reduce((total, contribution) => total + contribution.amount, 0)
}

export function attachAssociates(contributions, associates) {
  const associatesById = new Map(associates.map((associate) => [associate.id, associate]))
  return contributions
    .filter((contribution) => associatesById.has(contribution.associateId))
    .map((contribution) => ({ ...contribution, associate: associatesById.get(contribution.associateId) }))
}

export function getAssociateTotals(contributions, associates) {
  return associates.map((associate) => {
    const associateContributions = contributions.filter((contribution) => contribution.associateId === associate.id)
    return { associate, total: sumAmounts(associateContributions), count: associateContributions.length }
  })
}

function buildProgress(collected, target) {
  return {
    collected,
    target,
    remaining: Math.max(0, target - collected),
    percent: target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0,
    isComplete: collected >= target,
  }
}

export function getMonthlyProgress({ contributions, monthKey, associates, monthlyTargetPerAssociate }) {
  const monthContributions = contributions.filter((contribution) => getMonthKey(contribution.date) === monthKey)

  const items = associates.map((associate) => {
    const collected = sumAmounts(monthContributions.filter((contribution) => contribution.associateId === associate.id))
    return { associate, ...buildProgress(collected, monthlyTargetPerAssociate) }
  })

  const collective = buildProgress(
    sumAmounts(monthContributions.filter((contribution) => associates.some((associate) => associate.id === contribution.associateId))),
    monthlyTargetPerAssociate * associates.length,
  )

  return { items, collective }
}

export function normalizeSearchText(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s/g, '')
}

export function filterContributions(contributions, { search, associateId, monthKey }) {
  const query = normalizeSearchText(search)

  return contributions.filter((contribution) => {
    if (associateId && contribution.associateId !== associateId) return false
    if (monthKey && getMonthKey(contribution.date) !== monthKey) return false
    if (!query) return true

    const searchableText = normalizeSearchText(
      [
        contribution.associate.name,
        contribution.description,
        contribution.amount,
        formatNumber(contribution.amount),
        formatShortDate(contribution.date),
      ].join(' '),
    )
    return searchableText.includes(query)
  })
}

export function sortContributionsByDate(contributions, sortOrder) {
  const direction = sortOrder === 'date-asc' ? 1 : -1
  return [...contributions].sort(
    (first, second) => direction * (first.date.localeCompare(second.date) || first.id.localeCompare(second.id)),
  )
}
