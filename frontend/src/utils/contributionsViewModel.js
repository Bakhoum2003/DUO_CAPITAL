// Logique PURE du module Cotisations (sans React ni réseau) : filtres, validation du formulaire, mise en forme.
// Les montants viennent du serveur ; ici on ne fait que de la présentation et de la validation de saisie.

import { formatCurrency, formatMonthLabel } from './formatters'

export const DEFAULT_FILTERS = Object.freeze({ partnerId: '', period: '', year: '', from: '', to: '', page: 1 })
export const PAGE_SIZE = 20
export const MAX_NOTE_LENGTH = 300
const DATE = /^\d{4}-\d{2}-\d{2}$/
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/

/** Date du jour « AAAA-MM-JJ » à Dakar (le fonds raisonne en Africa/Dakar, pas dans le fuseau du navigateur). */
export function todayInDakar(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dakar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export const hasActiveFilters = (filters) => ['partnerId', 'period', 'year', 'from', 'to'].some((key) => Boolean(filters[key]))

/** Erreur de saisie des filtres (dates incohérentes), ou null. */
export function validateFilters(filters) {
  if (filters.from && !DATE.test(filters.from)) return 'La date de début est invalide.'
  if (filters.to && !DATE.test(filters.to)) return 'La date de fin est invalide.'
  if (filters.from && filters.to && filters.from > filters.to) return 'La date de fin ne peut pas précéder la date de début.'
  if (filters.year && !/^\d{4}$/.test(filters.year)) return "L'année est invalide."
  return null
}

/** URL de la liste : seuls les filtres renseignés sont envoyés (jamais d'identité d'utilisateur). */
export function buildContributionsPath(filters = DEFAULT_FILTERS) {
  const params = new URLSearchParams()
  for (const key of ['partnerId', 'period', 'year', 'from', 'to']) {
    if (filters[key]) params.set(key, filters[key])
  }
  params.set('page', String(filters.page || 1))
  params.set('pageSize', String(PAGE_SIZE))
  return `/api/v1/contributions?${params.toString()}`
}

/** « 2026-12 » … jusqu'au mois courant, du plus récent au plus ancien (liste du mois concerné). */
export function buildPeriodOptions(fundStartPeriod, currentPeriod) {
  if (!fundStartPeriod || !PERIOD.test(fundStartPeriod) || !PERIOD.test(currentPeriod) || fundStartPeriod > currentPeriod) return []
  const options = []
  let [year, month] = fundStartPeriod.split('-').map(Number)
  const [lastYear, lastMonth] = currentPeriod.split('-').map(Number)
  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    const key = `${year}-${String(month).padStart(2, '0')}`
    options.push({ value: key, label: formatMonthLabel(key) })
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return options.reverse()
}

/** « 15 000 » ou « 15000 » -> 15000 ; null si ce n'est pas un entier positif écrit en chiffres. */
export function parseAmountInput(raw) {
  const digits = String(raw ?? '').replace(/[\s  ]/g, '')
  return /^\d{1,15}$/.test(digits) ? Number(digits) : null
}

/**
 * Valide le formulaire d'enregistrement. Retourne { champ: message } (uniquement les champs en erreur).
 * @param {{ partnerId: string, amount: string, contributionDate: string, period: string, note: string }} values
 * @param {{ todayIso: string, fundStartPeriod: string | null, partnerIds: string[] }} context
 */
export function validateRecordForm(values, { todayIso, fundStartPeriod, partnerIds }) {
  const errors = {}
  if (!values.partnerId) errors.partnerId = "Choisissez l'associé concerné."
  else if (!partnerIds.includes(values.partnerId)) errors.partnerId = 'Associé inconnu.'

  const amount = parseAmountInput(values.amount)
  if (!String(values.amount ?? '').trim()) errors.amount = 'Le montant est obligatoire.'
  else if (amount === null) errors.amount = 'Saisissez un montant en chiffres entiers, sans décimale (ex. 15 000).'
  else if (amount <= 0) errors.amount = 'Le montant doit être strictement positif.'

  if (!values.contributionDate) errors.contributionDate = 'La date du versement est obligatoire.'
  else if (!DATE.test(values.contributionDate)) errors.contributionDate = 'La date est invalide.'
  else if (values.contributionDate > todayIso) errors.contributionDate = "La date ne peut pas être postérieure à aujourd'hui."
  else if (fundStartPeriod && values.contributionDate < `${fundStartPeriod}-01`) errors.contributionDate = `Le fonds démarre en ${formatMonthLabel(fundStartPeriod)}.`

  if (!values.period) errors.period = 'Choisissez le mois concerné.'
  else if (!PERIOD.test(values.period)) errors.period = 'Le mois est invalide.'
  else if (fundStartPeriod && values.period < fundStartPeriod) errors.period = `Le fonds démarre en ${formatMonthLabel(fundStartPeriod)}.`
  else if (values.period > todayIso.slice(0, 7)) errors.period = 'Le mois concerné ne peut pas être postérieur au mois en cours.'

  if (String(values.note ?? '').trim().length > MAX_NOTE_LENGTH) errors.note = `La note est limitée à ${MAX_NOTE_LENGTH} caractères.`
  return errors
}

/** Corps de la requête : montant en NOMBRE, note omise si vide. */
export function buildCreatePayload(values, { confirmDuplicate = false } = {}) {
  const payload = {
    partnerId: values.partnerId,
    amount: parseAmountInput(values.amount),
    contributionDate: values.contributionDate,
    period: values.period,
  }
  const note = String(values.note ?? '').trim()
  if (note) payload.note = note
  if (confirmDuplicate) payload.confirmDuplicate = true
  return payload
}

const FIELD_MAP = { partnerId: 'partnerId', amount: 'amount', contributionDate: 'contributionDate', period: 'period', note: 'note' }

/** Transforme une erreur d'API en { message, fieldErrors, needsDuplicateConfirmation } affichables. */
export function describeCreateError(error) {
  const fieldErrors = {}
  for (const item of error?.fields ?? []) {
    const field = FIELD_MAP[item.field]
    if (field && !fieldErrors[field]) fieldErrors[field] = item.message
  }
  return {
    message: error?.message || "L'enregistrement a échoué. Réessayez.",
    fieldErrors,
    needsDuplicateConfirmation: error?.code === 'DUPLICATE_SUSPECTED',
  }
}

export const percentLabel = (value) => (value == null ? '—' : `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value)} %`)

/** Six cartes de statistiques ; une valeur non calculable reste « Non calculable », jamais un faux 0. */
export function buildStatCards(summary) {
  const { collective, partners, expectedAvailable } = summary
  const names = (index) => partners[index]?.name ?? `Associé ${index + 1}`
  const money = (value) => (value == null ? 'Non calculable' : formatCurrency(value))
  return [
    { id: 'total', title: 'Total des cotisations', valueLabel: formatCurrency(collective.paid), footnote: `${collective.contributionsCount} versement(s) enregistré(s)`, tone: 'green' },
    { id: 'p1', title: `Cotisations de ${names(0)}`, valueLabel: formatCurrency(partners[0]?.paid ?? 0), footnote: `${partners[0]?.contributionsCount ?? 0} versement(s)`, tone: 'blue' },
    { id: 'p2', title: `Cotisations de ${names(1)}`, valueLabel: formatCurrency(partners[1]?.paid ?? 0), footnote: `${partners[1]?.contributionsCount ?? 0} versement(s)`, tone: 'violet' },
    { id: 'objective', title: 'Objectif collectif', valueLabel: money(collective.objective), footnote: expectedAvailable ? `${formatCurrency(summary.monthlyTargetCollective)} par mois` : 'Date de début du fonds non configurée', tone: 'orange' },
    { id: 'remaining', title: 'Montant restant', valueLabel: money(collective.remaining), footnote: collective.excess > 0 ? `Excédent visible : ${formatCurrency(collective.excess)}` : 'Objectif − cotisations conformes', tone: collective.remaining > 0 ? 'red' : 'green' },
    { id: 'rate', title: 'Taux de réalisation', valueLabel: percentLabel(collective.realizationRate), footnote: summary.fundStarted ? `${summary.monthsCount} mois concerné(s)` : 'Le fonds n\'a pas encore démarré', tone: 'green' },
  ]
}

/** Suivi individuel d'un associé (objectif mensuel, versé, restant, progression). */
export function buildPartnerProgress(partner) {
  const available = partner.expected != null
  const rate = partner.realizationRate
  return {
    id: partner.partnerId,
    name: partner.name,
    initials: partner.name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase(),
    monthlyTarget: partner.monthlyTarget,
    paid: partner.paid,
    remaining: available ? partner.remaining : null,
    excess: available ? partner.excess : null,
    percent: rate == null ? 0 : Math.min(100, Math.round(rate)),
    percentLabel: percentLabel(rate),
    isComplete: available && partner.expected > 0 && partner.remaining === 0,
    overdueMonths: partner.overdueMonths ?? [],
    paidMonths: partner.paidMonths,
    monthsCount: partner.monthsCount,
  }
}

export const MONTH_STATUS_LABELS = { PAID: 'Réglé', PARTIAL: 'Partiel', UNPAID: 'Non réglé' }

/** Ligne du suivi mensuel : statut collectif (réglé / en cours / en retard) et statut par associé. */
export function buildMonthRows(summary) {
  return [...summary.months].reverse().map((month) => ({
    period: month.period,
    label: formatMonthLabel(month.period),
    target: month.target,
    paid: month.paid,
    remaining: month.remaining,
    state: month.isComplete ? 'COMPLETE' : month.isOverdue ? 'OVERDUE' : 'IN_PROGRESS',
    partners: month.partners.map((partner) => ({ ...partner, statusLabel: MONTH_STATUS_LABELS[partner.status] })),
  }))
}
export const MONTH_STATE_LABELS = { COMPLETE: 'Mois réglé', OVERDUE: 'Non réglé (en retard)', IN_PROGRESS: 'En cours' }
