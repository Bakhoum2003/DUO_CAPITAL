// Consultation des retraits : fonctions PURES (filtre, recherche, tri, pagination, indicateurs).
// Les retraits reçus sont déjà les enregistrements non supprimés ; les montants viennent uniquement de ces enregistrements.

import { toNameKey } from '../../models/shared/validators.js'
import { toWithdrawalView } from './view.js'

export const WITHDRAWAL_SORTS = Object.freeze(['date_desc', 'date_asc', 'amount_desc', 'amount_asc'])
export const LATEST_COUNT = 5
const idOf = (value) => (value == null ? null : String(value))
const sum = (list) => list.reduce((total, item) => total + item.amount, 0)

const COMPARATORS = {
  date_desc: (a, b) => b.withdrawalDate.localeCompare(a.withdrawalDate),
  date_asc: (a, b) => a.withdrawalDate.localeCompare(b.withdrawalDate),
  amount_desc: (a, b) => b.amount - a.amount,
  amount_asc: (a, b) => a.amount - b.amount,
}

// Ordre total et stable : critère demandé, puis date, heure d'enregistrement et identifiant.
function compare(sort) {
  const main = COMPARATORS[sort] ?? COMPARATORS.date_desc
  return (a, b) =>
    main(a, b) ||
    b.withdrawalDate.localeCompare(a.withdrawalDate) ||
    new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0) ||
    idOf(b._id).localeCompare(idOf(a._id))
}

const haystackOf = (withdrawal, users) =>
  toNameKey([withdrawal.reason, users.get(idOf(withdrawal.beneficiary))?.name, users.get(idOf(withdrawal.recordedBy))?.name, String(withdrawal.amount), withdrawal.withdrawalDate].filter(Boolean).join(' '))

/**
 * @param {object[]} withdrawals enregistrements actifs
 * @param {Map<string, object>} users annuaire des associés
 * @param {{ search?: string, beneficiaryId?: string, authorId?: string, from?: string, to?: string, sort?: string, page: number, pageSize: number }} query
 */
export function listWithdrawals(withdrawals, users, query) {
  const needle = query.search ? toNameKey(query.search) : ''
  const matching = withdrawals.filter(
    (item) =>
      (!query.beneficiaryId || idOf(item.beneficiary) === query.beneficiaryId) &&
      (!query.authorId || idOf(item.recordedBy) === query.authorId) &&
      (!query.from || item.withdrawalDate >= query.from) &&
      (!query.to || item.withdrawalDate <= query.to) &&
      (!needle || haystackOf(item, users).includes(needle)),
  )
  matching.sort(compare(query.sort ?? 'date_desc'))
  const total = matching.length
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize))
  const page = Math.min(query.page, totalPages)
  const items = matching.slice((page - 1) * query.pageSize, page * query.pageSize)
  return {
    withdrawals: items.map((item) => toWithdrawalView(item, users)),
    meta: { page, pageSize: query.pageSize, total, totalPages, filteredAmount: sum(matching) },
  }
}

/** Indicateurs globaux (tous les retraits actifs, quel que soit le filtre de la liste). */
export function summarizeWithdrawals(withdrawals, users, partners) {
  const latest = [...withdrawals].sort(compare('date_desc')).slice(0, LATEST_COUNT)
  return {
    count: withdrawals.length,
    totalAmount: sum(withdrawals),
    byBeneficiary: partners.map((partner) => {
      const own = withdrawals.filter((item) => idOf(item.beneficiary) === partner.id)
      return { partner, amount: sum(own), count: own.length }
    }),
    latest: latest.map((item) => toWithdrawalView(item, users)),
  }
}
