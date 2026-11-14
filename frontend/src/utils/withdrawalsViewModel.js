// Logique PURE du module Retraits (sans React ni réseau) : filtres, validation, corps des requêtes, messages, cartes.
// Le backend reste la source de vérité : montants, soldes et totaux viennent de l'API ; ici, uniquement de la
// présentation et un contrôle de saisie (qui ne remplace jamais celui du serveur).

import { formatShortDate } from './formatters'
import { parseAmountInput } from './contributionsViewModel'
import { formatMoney } from './treasuryViewModel'

export const PAGE_SIZE = 20
export const MAX_REASON_LENGTH = 300
const DATE = /^\d{4}-\d{2}-\d{2}$/

export const DEFAULT_FILTERS = Object.freeze({ search: '', beneficiaryId: '', authorId: '', from: '', to: '', sort: 'date_desc', page: 1 })
export const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Date : plus récents' },
  { value: 'date_asc', label: 'Date : plus anciens' },
  { value: 'amount_desc', label: 'Montant : du plus élevé' },
  { value: 'amount_asc', label: 'Montant : du plus faible' },
]

export const hasActiveFilters = (filters) => ['search', 'beneficiaryId', 'authorId', 'from', 'to'].some((key) => Boolean(filters[key]))

/** Message d'erreur si la période est incohérente (la requête n'est alors pas envoyée), sinon null. */
export function validateFilters(filters) {
  if (filters.from && !DATE.test(filters.from)) return 'La date de début est invalide.'
  if (filters.to && !DATE.test(filters.to)) return 'La date de fin est invalide.'
  if (filters.from && filters.to && filters.to < filters.from) return 'La date de fin ne peut pas précéder la date de début.'
  return null
}

/** Adresse de la liste : paramètres exactement ceux attendus par le backend. */
export function buildWithdrawalsPath(filters = DEFAULT_FILTERS) {
  const params = new URLSearchParams()
  for (const key of ['search', 'beneficiaryId', 'authorId', 'from', 'to']) {
    if (filters[key]) params.set(key, filters[key])
  }
  params.set('sort', filters.sort || DEFAULT_FILTERS.sort)
  params.set('page', String(filters.page || 1))
  params.set('pageSize', String(PAGE_SIZE))
  return `/api/v1/withdrawals?${params.toString()}`
}

export const withdrawalPath = (id) => `/api/v1/withdrawals/${encodeURIComponent(id)}`

/* ------------------------------- Formulaire ------------------------------- */

export const EMPTY_FORM = Object.freeze({ beneficiaryId: '', amount: '', withdrawalDate: '', reason: '' })

/** Valeurs initiales de création : la date du jour ; AUCUN bénéficiaire par défaut (il n'est jamais déduit de l'auteur). */
export const buildCreateValues = (todayIso) => ({ ...EMPTY_FORM, withdrawalDate: todayIso })

/** Valeurs initiales de modification, à partir du retrait renvoyé par l'API. */
export const buildEditValues = (withdrawal) => ({
  beneficiaryId: withdrawal.beneficiary.id,
  amount: String(withdrawal.amount),
  withdrawalDate: withdrawal.withdrawalDate,
  reason: withdrawal.reason ?? '',
})

/**
 * Contrôle de saisie. Retourne { champ: message } (uniquement les champs en erreur).
 * `availableBalance` : solde annoncé par l'API (null = inconnu : pas de contrôle de solde côté écran) ; le serveur décide toujours.
 * @param {{ beneficiaryId: string, amount: string, withdrawalDate: string, reason: string }} values
 * @param {{ todayIso: string, partnerIds: string[], availableBalance?: number | null }} context
 */
export function validateWithdrawalForm(values, { todayIso, partnerIds, availableBalance = null }) {
  const errors = {}
  if (!values.beneficiaryId) errors.beneficiaryId = "Choisissez l'associé bénéficiaire."
  else if (!partnerIds.includes(values.beneficiaryId)) errors.beneficiaryId = 'Associé inconnu.'

  const amount = parseAmountInput(values.amount)
  if (!String(values.amount ?? '').trim()) errors.amount = 'Le montant est obligatoire.'
  else if (amount === null) errors.amount = 'Saisissez un montant en chiffres entiers, sans décimale (ex. 25 000).'
  else if (amount <= 0) errors.amount = 'Le montant doit être strictement positif.'
  else if (availableBalance !== null && amount > availableBalance) errors.amount = `La trésorerie disponible (${formatMoney(availableBalance)}) ne permet pas ce retrait.`

  if (!values.withdrawalDate) errors.withdrawalDate = 'La date du retrait est obligatoire.'
  else if (!DATE.test(values.withdrawalDate)) errors.withdrawalDate = 'La date est invalide.'
  else if (values.withdrawalDate > todayIso) errors.withdrawalDate = "La date ne peut pas être postérieure à aujourd'hui."

  if (String(values.reason ?? '').trim().length > MAX_REASON_LENGTH) errors.reason = `Le motif est limité à ${MAX_REASON_LENGTH} caractères.`
  return errors
}

/** Corps de création : montant en NOMBRE, motif omis si vide. Aucun auteur, aucun solde : le serveur les connaît. */
export function buildCreatePayload(values) {
  const payload = { beneficiaryId: values.beneficiaryId, amount: parseAmountInput(values.amount), withdrawalDate: values.withdrawalDate }
  const reason = String(values.reason ?? '').trim()
  if (reason) payload.reason = reason
  return payload
}

/** Corps de modification : uniquement les champs réellement changés (vide = aucune modification). */
export function buildUpdatePayload(values, original) {
  const changes = {}
  if (values.beneficiaryId !== original.beneficiary.id) changes.beneficiaryId = values.beneficiaryId
  const amount = parseAmountInput(values.amount)
  if (amount !== original.amount) changes.amount = amount
  if (values.withdrawalDate !== original.withdrawalDate) changes.withdrawalDate = values.withdrawalDate
  const reason = String(values.reason ?? '').trim()
  if (reason !== (original.reason ?? '')) changes.reason = reason || null
  return changes
}

const FIELD_NAMES = new Set(['beneficiaryId', 'amount', 'withdrawalDate', 'reason'])
const CODE_MESSAGES = {
  INSUFFICIENT_TREASURY: 'La trésorerie disponible ne permet pas ce retrait. Aucun retrait n’a été enregistré.',
  OUTFLOW_DATE_IN_FUTURE: "La date d'un retrait ne peut pas être postérieure à aujourd'hui.",
  IDEMPOTENCY_KEY_REUSED: "Cette demande d'envoi a déjà servi pour un autre retrait. Réessayez.",
  REQUEST_IN_PROGRESS: 'Cet enregistrement est déjà en cours de traitement. Patientez un instant.',
  PARTNER_NOT_FOUND: 'Associé bénéficiaire introuvable.',
  WITHDRAWAL_NOT_FOUND: "Ce retrait n'existe plus ou a déjà été supprimé.",
}

/** Transforme une erreur d'API en { message, fieldErrors } affichables (jamais de détail technique). */
export function describeWithdrawalError(error) {
  const fieldErrors = {}
  for (const item of Array.isArray(error?.fields) ? error.fields : []) {
    const field = String(item.field ?? '')
    if (FIELD_NAMES.has(field) && !fieldErrors[field]) fieldErrors[field] = item.message
  }
  return { message: CODE_MESSAGES[error?.code] ?? error?.message ?? "L'opération a échoué. Réessayez.", fieldErrors }
}

/* ------------------------------- Présentation ------------------------------ */

/** Cartes d'indicateurs : valeurs de l'API (jamais recalculées). « — » tant que la synthèse n'est pas chargée. */
export function buildSummaryCards(summary) {
  const byId = new Map((summary?.byBeneficiary ?? []).map((row) => [row.partner.id, row]))
  const partnerCards = (summary?.partners ?? []).map((partner) => {
    const row = byId.get(partner.id)
    return { id: `beneficiary-${partner.id}`, title: `Retiré au bénéfice de ${partner.name}`, valueLabel: formatMoney(row?.amount), footnote: `${row?.count ?? 0} retrait(s)`, tone: partner.partnerNumber === 1 ? 'blue' : 'violet' }
  })
  return [
    { id: 'count', title: 'Nombre de retraits', valueLabel: summary ? String(summary.count) : '—', footnote: 'retraits enregistrés', tone: 'blue' },
    { id: 'total', title: 'Montant total retiré', valueLabel: formatMoney(summary?.totalAmount), footnote: 'tous retraits confondus', tone: 'red' },
    ...partnerCards,
  ]
}

/** Solde disponible annoncé par l'API (affiché dans le formulaire et en en-tête). */
export const availableBalanceOf = (summary) => (Number.isFinite(summary?.treasury?.balance) ? summary.treasury.balance : null)

/** Solde utilisable pour une MODIFICATION : le montant déjà retiré redevient disponible (null si inconnu). */
export function availableForEdit(summary, original) {
  const balance = availableBalanceOf(summary)
  return balance === null || !original ? balance : balance + original.amount
}

/** Lignes du détail : uniquement ce que l'API renvoie. */
export function buildDetailRows(withdrawal) {
  const rows = [
    { label: 'Date du retrait', value: formatShortDate(withdrawal.withdrawalDate) },
    { label: 'Montant', value: formatMoney(withdrawal.amount) },
    { label: 'Bénéficiaire', value: withdrawal.beneficiary?.name ?? '—' },
    { label: 'Enregistré par', value: withdrawal.recordedBy?.name ?? '—' },
    { label: 'Motif', value: withdrawal.reason || 'Aucun motif renseigné' },
  ]
  return rows
}
