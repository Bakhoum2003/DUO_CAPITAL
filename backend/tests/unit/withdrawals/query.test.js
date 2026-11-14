import { describe, expect, it } from 'vitest'
import { hashWithdrawalRequest } from '../../../src/services/withdrawals/requestHash.js'
import { listWithdrawals, summarizeWithdrawals } from '../../../src/services/withdrawals/query.js'
import { toAuditSnapshot, toWithdrawalView } from '../../../src/services/withdrawals/view.js'
import { createWithdrawalSchema, deleteWithdrawalSchema, listWithdrawalsQuerySchema, updateWithdrawalSchema } from '../../../src/validation/withdrawal.schemas.js'

const MOHAMED = 'a'.repeat(24)
const CHEIKH = 'b'.repeat(24)
const users = new Map([
  [MOHAMED, { name: 'Mohamed Bakhoum', partnerNumber: 1 }],
  [CHEIKH, { name: 'Cheikh Sow', partnerNumber: 2 }],
])
const partners = [
  { id: MOHAMED, name: 'Mohamed Bakhoum', partnerNumber: 1 },
  { id: CHEIKH, name: 'Cheikh Sow', partnerNumber: 2 },
]
const make = (n, beneficiary, recordedBy, amount, withdrawalDate, reason = null) => ({
  _id: String(n).padStart(24, '0'), beneficiary, recordedBy, amount, withdrawalDate, reason, createdAt: new Date(`2026-12-${String(10 + n).padStart(2, '0')}T08:00:00Z`), updatedAt: new Date('2026-12-20T08:00:00Z'),
})
const data = [
  make(1, CHEIKH, MOHAMED, 10000, '2026-12-01', 'Loyer'),
  make(2, MOHAMED, CHEIKH, 25000, '2026-12-05', 'Médicaments'),
  make(3, MOHAMED, MOHAMED, 5000, '2026-12-05'),
  make(4, CHEIKH, CHEIKH, 40000, '2026-12-10', 'Équipement'),
]
const q = (extra = {}) => ({ page: 1, pageSize: 20, sort: 'date_desc', ...extra })
const ids = (result) => result.withdrawals.map((item) => Number(item.id))

describe('vue publique', () => {
  it('bénéficiaire et auteur distincts, aucun secret', () => {
    const view = toWithdrawalView(data[0], users)
    expect(view.beneficiary).toEqual({ id: CHEIKH, name: 'Cheikh Sow', partnerNumber: 2 })
    expect(view.recordedBy).toEqual({ id: MOHAMED, name: 'Mohamed Bakhoum', partnerNumber: 1 })
    expect(view.amount).toBe(10000)
    expect(view.reason).toBe('Loyer')
    expect(/email|password|hash/i.test(JSON.stringify(view))).toBe(false)
    expect(toWithdrawalView({ ...data[2], reason: undefined }, users).reason).toBeNull()
  })

  it("instantané d'audit : champs métier uniquement", () => {
    expect(toAuditSnapshot(data[0])).toEqual({ beneficiary: CHEIKH, recordedBy: MOHAMED, amount: 10000, withdrawalDate: '2026-12-01', reason: 'Loyer' })
  })
})

describe('liste : tri, filtres, recherche, pagination', () => {
  it('tri par date décroissante puis ordre stable', () => {
    expect(ids(listWithdrawals(data, users, q()))).toEqual([4, 3, 2, 1])
    expect(ids(listWithdrawals(data, users, q({ sort: 'date_asc' })))).toEqual([1, 3, 2, 4])
  })

  it('tri par montant', () => {
    expect(ids(listWithdrawals(data, users, q({ sort: 'amount_desc' })))).toEqual([4, 2, 1, 3])
    expect(ids(listWithdrawals(data, users, q({ sort: 'amount_asc' })))).toEqual([3, 1, 2, 4])
  })

  it('filtres bénéficiaire, auteur et période (bornes incluses)', () => {
    expect(ids(listWithdrawals(data, users, q({ beneficiaryId: MOHAMED })))).toEqual([3, 2])
    expect(ids(listWithdrawals(data, users, q({ authorId: CHEIKH })))).toEqual([4, 2])
    expect(ids(listWithdrawals(data, users, q({ from: '2026-12-05', to: '2026-12-05' })))).toEqual([3, 2])
    expect(ids(listWithdrawals(data, users, q({ beneficiaryId: MOHAMED, authorId: CHEIKH })))).toEqual([2])
    expect(ids(listWithdrawals(data, users, q({ beneficiaryId: 'c'.repeat(24) })))).toEqual([])
  })

  it('recherche sans accent ni casse : motif, noms, montant', () => {
    expect(ids(listWithdrawals(data, users, q({ search: 'medicaments' })))).toEqual([2])
    expect(ids(listWithdrawals(data, users, q({ search: 'EQUIPEMENT' })))).toEqual([4])
    expect(ids(listWithdrawals(data, users, q({ search: 'cheikh' })))).toEqual([4, 2, 1])
    expect(ids(listWithdrawals(data, users, q({ search: '25000' })))).toEqual([2])
    expect(ids(listWithdrawals(data, users, q({ search: 'introuvable' })))).toEqual([])
  })

  it('pagination : méta, page au-delà de la dernière ramenée à la dernière, total filtré', () => {
    const first = listWithdrawals(data, users, q({ pageSize: 3 }))
    expect(first.meta).toEqual({ page: 1, pageSize: 3, total: 4, totalPages: 2, filteredAmount: 80000 })
    expect(ids(first)).toEqual([4, 3, 2])
    const beyond = listWithdrawals(data, users, q({ pageSize: 3, page: 9 }))
    expect(beyond.meta.page).toBe(2)
    expect(ids(beyond)).toEqual([1])
    const none = listWithdrawals([], users, q())
    expect(none.meta).toEqual({ page: 1, pageSize: 20, total: 0, totalPages: 1, filteredAmount: 0 })
  })
})

describe('indicateurs', () => {
  it('nombre, total, total par bénéficiaire, derniers retraits', () => {
    const summary = summarizeWithdrawals(data, users, partners)
    expect(summary.count).toBe(4)
    expect(summary.totalAmount).toBe(80000)
    expect(summary.byBeneficiary.map((row) => [row.partner.name, row.amount, row.count])).toEqual([['Mohamed Bakhoum', 30000, 2], ['Cheikh Sow', 50000, 2]])
    expect(summary.latest.map((item) => Number(item.id))).toEqual([4, 3, 2, 1])
    expect(summarizeWithdrawals(data.concat([1, 2, 3, 4].map((n) => make(n + 4, MOHAMED, MOHAMED, 1, '2026-12-11'))), users, partners).latest).toHaveLength(5)
  })

  it('aucun retrait : zéros, jamais de donnée inventée', () => {
    const summary = summarizeWithdrawals([], users, partners)
    expect([summary.count, summary.totalAmount, summary.latest.length]).toEqual([0, 0, 0])
    expect(summary.byBeneficiary.every((row) => row.amount === 0 && row.count === 0)).toBe(true)
  })
})

describe('empreinte de requête', () => {
  const body = { beneficiaryId: CHEIKH, amount: 1000, withdrawalDate: '2026-12-01', reason: null }
  it('stable, et différente dès qu’un champ métier change', () => {
    expect(hashWithdrawalRequest(body)).toBe(hashWithdrawalRequest({ ...body }))
    expect(hashWithdrawalRequest(body)).toMatch(/^[a-f0-9]{64}$/)
    for (const change of [{ beneficiaryId: MOHAMED }, { amount: 1001 }, { withdrawalDate: '2026-12-02' }, { reason: 'x' }]) expect(hashWithdrawalRequest({ ...body, ...change })).not.toBe(hashWithdrawalRequest(body))
  })
})

describe('schémas de validation', () => {
  const valid = { beneficiaryId: CHEIKH, amount: 10000, withdrawalDate: '2026-12-01' }
  const fail = (schema, value) => schema.safeParse(value).success === false

  it('création valide ; motif facultatif nettoyé', () => {
    expect(createWithdrawalSchema.parse(valid)).toEqual({ ...valid, reason: null })
    expect(createWithdrawalSchema.parse({ ...valid, reason: '  Loyer  ' }).reason).toBe('Loyer')
    expect(createWithdrawalSchema.parse({ ...valid, reason: '   ' }).reason).toBeNull()
  })

  it('montant : nul, négatif, décimal, texte refusés', () => {
    for (const amount of [0, -5, 10.5, '1000', null, Number.NaN]) expect(fail(createWithdrawalSchema, { ...valid, amount })).toBe(true)
  })

  it('bénéficiaire invalide ou absent, date invalide ou absente refusés', () => {
    for (const beneficiaryId of [undefined, '', 'abc', 'Z'.repeat(24)]) expect(fail(createWithdrawalSchema, { ...valid, beneficiaryId })).toBe(true)
    for (const withdrawalDate of [undefined, '2026-13-01', '2026-02-30', '01/12/2026', 20261201]) expect(fail(createWithdrawalSchema, { ...valid, withdrawalDate })).toBe(true)
  })

  it('motif trop long ; champs inconnus (auteur, solde, suppression) refusés', () => {
    expect(fail(createWithdrawalSchema, { ...valid, reason: 'x'.repeat(301) })).toBe(true)
    for (const extra of [{ recordedBy: MOHAMED }, { balance: 1 }, { deletedAt: '2026-12-01' }, { authorId: MOHAMED }]) expect(fail(createWithdrawalSchema, { ...valid, ...extra })).toBe(true)
  })

  it('modification : au moins un champ, auteur jamais modifiable', () => {
    expect(fail(updateWithdrawalSchema, {})).toBe(true)
    expect(updateWithdrawalSchema.parse({ amount: 500 })).toEqual({ amount: 500 })
    expect(updateWithdrawalSchema.parse({ reason: null })).toEqual({ reason: null })
    expect(fail(updateWithdrawalSchema, { recordedBy: MOHAMED })).toBe(true)
    expect(fail(updateWithdrawalSchema, { amount: 0 })).toBe(true)
  })

  it('suppression : motif facultatif', () => {
    expect(deleteWithdrawalSchema.parse({})).toEqual({ reason: null })
    expect(deleteWithdrawalSchema.parse({ reason: ' Erreur de saisie ' }).reason).toBe('Erreur de saisie')
    expect(fail(deleteWithdrawalSchema, { reason: 'x'.repeat(301) })).toBe(true)
    expect(fail(deleteWithdrawalSchema, { amount: 1 })).toBe(true)
  })

  it('requête de liste : valeurs par défaut, bornes et paramètres inconnus', () => {
    expect(listWithdrawalsQuerySchema.parse({})).toMatchObject({ sort: 'date_desc', page: 1, pageSize: 20 })
    expect(listWithdrawalsQuerySchema.parse({ page: '3', pageSize: '50', sort: 'amount_asc' })).toMatchObject({ page: 3, pageSize: 50, sort: 'amount_asc' })
    for (const bad of [{ pageSize: '101' }, { page: '0' }, { sort: 'x' }, { beneficiaryId: 'abc' }, { from: '2026-12-10', to: '2026-12-01' }, { inconnu: '1' }]) expect(fail(listWithdrawalsQuerySchema, bad)).toBe(true)
  })
})
