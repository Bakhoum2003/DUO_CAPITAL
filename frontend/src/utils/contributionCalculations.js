import { formatMonthLabel, formatNumber, formatShortDate } from './formatters'

// Tous les calculs du module Cotisations (fonctions pures, sans React ni montant codé en dur).
// Les dates sont au format « AAAA-MM-JJ » et les mois au format « AAAA-MM ».

export function getMonthKey(isoDate) {
  return isoDate.slice(0, 7)
}

// Date du jour au format ISO, dans le fuseau horaire de l'utilisateur.
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

// Premier et dernier mois navigables : du plus ancien mois avec données jusqu'au mois en cours.
export function getMonthBounds(contributions, currentMonthKey) {
  const monthKeys = [...contributions.map((contribution) => getMonthKey(contribution.date)), currentMonthKey].sort()
  return { first: monthKeys[0], last: monthKeys[monthKeys.length - 1] }
}

export function clampMonthKey(monthKey, first, last) {
  if (monthKey < first) return first
  if (monthKey > last) return last
  return monthKey
}

// Mois ayant au moins une cotisation, du plus récent au plus ancien (options du filtre « mois »).
export function getMonthOptions(contributions) {
  const monthKeys = [...new Set(contributions.map((contribution) => getMonthKey(contribution.date)))]
  return monthKeys.sort().reverse().map((monthKey) => ({ value: monthKey, label: formatMonthLabel(monthKey) }))
}

export function sumAmounts(contributions) {
  return contributions.reduce((total, contribution) => total + contribution.amount, 0)
}

// Ajoute à chaque cotisation l'associé correspondant (objet `associate`).
export function attachAssociates(contributions, associates) {
  const associatesById = new Map(associates.map((associate) => [associate.id, associate]))
  return contributions
    .filter((contribution) => associatesById.has(contribution.associateId))
    .map((contribution) => ({ ...contribution, associate: associatesById.get(contribution.associateId) }))
}

// Total et nombre de cotisations de chaque associé.
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

// Progression d'un mois : une ligne par associé + la progression collective.
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

// Minuscules, sans accents ni espaces : « Cotisation » et « cotisation » se valent, « 15 000 » et « 15000 » aussi.
export function normalizeSearchText(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s/g, '')
}

// Filtre des cotisations (déjà associées à leur associé) par texte, associé et mois.
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

// Tri par date ('date-desc' : plus récentes d'abord, 'date-asc' : plus anciennes d'abord).
export function sortContributionsByDate(contributions, sortOrder) {
  const direction = sortOrder === 'date-asc' ? 1 : -1
  return [...contributions].sort(
    (first, second) => direction * (first.date.localeCompare(second.date) || first.id.localeCompare(second.id)),
  )
}
