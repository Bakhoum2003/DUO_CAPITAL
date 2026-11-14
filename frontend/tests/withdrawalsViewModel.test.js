import { describe, expect, it } from 'vitest'
import { createWithdrawalActions, IDLE_MUTATION } from '../src/utils/withdrawalsActions'
import {
  DEFAULT_FILTERS, SORT_OPTIONS, availableBalanceOf, availableForEdit, buildCreatePayload, buildCreateValues, buildDetailRows, buildEditValues, buildSummaryCards,
  buildUpdatePayload, buildWithdrawalsPath, describeWithdrawalError, hasActiveFilters, validateFilters, validateWithdrawalForm, withdrawalPath,
} from '../src/utils/withdrawalsViewModel'

const MOHAMED = 'a'.repeat(24)
const CHEIKH = 'b'.repeat(24)
const context = { todayIso: '2026-12-20', partnerIds: [MOHAMED, CHEIKH], availableBalance: 100000 }
const valid = { beneficiaryId: CHEIKH, amount: '25 000', withdrawalDate: '2026-12-18', reason: '  Loyer ' }
const original = { id: 'w1', beneficiary: { id: CHEIKH, name: 'Cheikh Sow' }, recordedBy: { id: MOHAMED, name: 'Mohamed Bakhoum' }, amount: 25000, withdrawalDate: '2026-12-18', reason: 'Loyer', createdAt: '2026-12-18T08:00:00.000Z' }

describe('formulaire : validation de saisie (le serveur reste l’autorité)', () => {
  it('saisie valide', () => {
    expect(validateWithdrawalForm(valid, context)).toEqual({})
  })

  it('bénéficiaire obligatoire et connu ; jamais déduit', () => {
    expect(validateWithdrawalForm({ ...valid, beneficiaryId: '' }, context).beneficiaryId).toMatch(/Choisissez/)
    expect(validateWithdrawalForm({ ...valid, beneficiaryId: 'c'.repeat(24) }, context).beneficiaryId).toMatch(/inconnu/)
    expect(buildCreateValues('2026-12-20')).toEqual({ beneficiaryId: '', amount: '', withdrawalDate: '2026-12-20', reason: '' })
  })

  it('montant : vide, nul, négatif, décimal, texte refusés', () => {
    for (const amount of ['', '0', '-5', '10,5', '12.5', 'abc']) expect(Boolean(validateWithdrawalForm({ ...valid, amount }, context).amount)).toBe(true)
    expect(validateWithdrawalForm({ ...valid, amount: '1 000' }, context).amount).toBeUndefined()
  })

  it('solde : montant supérieur au solde annoncé refusé, égal accepté, solde inconnu = pas de contrôle', () => {
    expect(validateWithdrawalForm({ ...valid, amount: '100001' }, context).amount).toMatch(/ne permet pas/)
    expect(validateWithdrawalForm({ ...valid, amount: '100000' }, context).amount).toBeUndefined()
    expect(validateWithdrawalForm({ ...valid, amount: '999999999' }, { ...context, availableBalance: null }).amount).toBeUndefined()
  })

  it('date : obligatoire, valide, jamais future', () => {
    expect(validateWithdrawalForm({ ...valid, withdrawalDate: '' }, context).withdrawalDate).toMatch(/obligatoire/)
    expect(validateWithdrawalForm({ ...valid, withdrawalDate: '20/12/2026' }, context).withdrawalDate).toMatch(/invalide/)
    expect(validateWithdrawalForm({ ...valid, withdrawalDate: '2026-12-21' }, context).withdrawalDate).toMatch(/postérieure/)
    expect(validateWithdrawalForm({ ...valid, withdrawalDate: '2026-12-20' }, context).withdrawalDate).toBeUndefined()
  })

  it('motif facultatif, limité à 300 caractères', () => {
    expect(validateWithdrawalForm({ ...valid, reason: '' }, context).reason).toBeUndefined()
    expect(validateWithdrawalForm({ ...valid, reason: 'x'.repeat(301) }, context).reason).toMatch(/300/)
  })
})

describe('corps des requêtes', () => {
  it('création : montant en nombre, motif nettoyé ou omis, aucun auteur ni solde', () => {
    expect(buildCreatePayload(valid)).toEqual({ beneficiaryId: CHEIKH, amount: 25000, withdrawalDate: '2026-12-18', reason: 'Loyer' })
    expect(buildCreatePayload({ ...valid, reason: '   ' })).toEqual({ beneficiaryId: CHEIKH, amount: 25000, withdrawalDate: '2026-12-18' })
    expect(Object.keys(buildCreatePayload(valid)).some((key) => /recordedBy|author|balance/i.test(key))).toBe(false)
  })

  it('modification : uniquement les champs réellement changés', () => {
    expect(buildUpdatePayload(buildEditValues(original), original)).toEqual({})
    expect(buildUpdatePayload({ ...buildEditValues(original), amount: '30000' }, original)).toEqual({ amount: 30000 })
    expect(buildUpdatePayload({ ...buildEditValues(original), beneficiaryId: MOHAMED, withdrawalDate: '2026-12-01', reason: '' }, original)).toEqual({ beneficiaryId: MOHAMED, withdrawalDate: '2026-12-01', reason: null })
    expect(buildEditValues({ ...original, reason: null }).reason).toBe('')
  })

  it('solde utilisable pour une modification : le montant déjà retiré redevient disponible', () => {
    const summary = { treasury: { balance: 40000 } }
    expect(availableBalanceOf(summary)).toBe(40000)
    expect(availableForEdit(summary, original)).toBe(65000)
    expect(availableBalanceOf(null)).toBeNull()
    expect(availableForEdit(null, original)).toBeNull()
  })
})

describe('messages d’erreur', () => {
  it('trésorerie insuffisante : message explicite, aucun détail technique', () => {
    const { message } = describeWithdrawalError({ status: 409, code: 'INSUFFICIENT_TREASURY', message: 'Trésorerie insuffisante : 5 FCFA disponibles, 9 FCFA demandés.' })
    expect(message).toMatch(/trésorerie disponible ne permet pas/i)
    expect(message).toMatch(/Aucun retrait/)
  })

  it('erreurs par champ associées au bon champ ; champ inconnu ignoré', () => {
    const result = describeWithdrawalError({ code: 'VALIDATION_ERROR', message: 'Invalide.', fields: [{ field: 'amount', message: 'Trop faible.' }, { field: 'recordedBy', message: 'x' }, { field: 'withdrawalDate', message: 'Date invalide.' }] })
    expect(result.fieldErrors).toEqual({ amount: 'Trop faible.', withdrawalDate: 'Date invalide.' })
    expect(describeWithdrawalError(undefined).message).toMatch(/échoué/)
    expect(describeWithdrawalError({ code: 'OUTFLOW_DATE_IN_FUTURE' }).message).toMatch(/aujourd'hui/)
  })
})

describe('filtres et adresse', () => {
  it('filtres actifs, réinitialisation, tri', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: 'amount_asc', page: 4 })).toBe(false)
    for (const key of ['search', 'beneficiaryId', 'authorId', 'from', 'to']) expect(hasActiveFilters({ ...DEFAULT_FILTERS, [key]: 'x' })).toBe(true)
    expect(SORT_OPTIONS.map((option) => option.value)).toEqual(['date_desc', 'date_asc', 'amount_desc', 'amount_asc'])
  })

  it('période incohérente détectée', () => {
    expect(validateFilters(DEFAULT_FILTERS)).toBeNull()
    expect(validateFilters({ ...DEFAULT_FILTERS, from: '2026-12-10', to: '2026-12-01' })).toMatch(/précéder/)
    expect(validateFilters({ ...DEFAULT_FILTERS, from: 'hier' })).toMatch(/début/)
    expect(validateFilters({ ...DEFAULT_FILTERS, from: '2026-12-01', to: '2026-12-01' })).toBeNull()
  })

  it('caractères spéciaux encodés', () => {
    const url = buildWithdrawalsPath({ ...DEFAULT_FILTERS, search: 'a&b=c #1' })
    expect(new URL(url, 'http://x').searchParams.get('search')).toBe('a&b=c #1')
    expect(withdrawalPath('a/b')).toBe('/api/v1/withdrawals/a%2Fb')
  })
})

describe('affichage : exactement les données de l’API', () => {
  const summary = {
    count: 3, totalAmount: 80000,
    partners: [{ id: MOHAMED, name: 'Mohamed Bakhoum', partnerNumber: 1 }, { id: CHEIKH, name: 'Cheikh Sow', partnerNumber: 2 }],
    byBeneficiary: [{ partner: { id: MOHAMED }, amount: 30000, count: 2 }, { partner: { id: CHEIKH }, amount: 50000, count: 1 }],
  }

  it('quatre indicateurs : nombre, total, un par bénéficiaire', () => {
    const cards = buildSummaryCards(summary)
    expect(cards.map((card) => card.id)).toEqual(['count', 'total', `beneficiary-${MOHAMED}`, `beneficiary-${CHEIKH}`])
    expect(cards[0].valueLabel).toBe('3')
    expect(cards[1].valueLabel.replace(/\s/g, ' ')).toBe('80 000 FCFA')
    expect(cards[2].title).toContain('Mohamed Bakhoum')
    expect(cards[2].valueLabel.replace(/\s/g, ' ')).toBe('30 000 FCFA')
    expect(cards[3].footnote).toBe('1 retrait(s)')
  })

  it('synthèse absente : « — », jamais un faux zéro ; aucun retrait : zéros réels', () => {
    expect(buildSummaryCards(null).slice(0, 2).every((card) => card.valueLabel === '—')).toBe(true)
    const empty = buildSummaryCards({ ...summary, count: 0, totalAmount: 0, byBeneficiary: summary.byBeneficiary.map((row) => ({ ...row, amount: 0, count: 0 })) })
    expect(empty[0].valueLabel).toBe('0')
    expect(empty[1].valueLabel).toBe('0 FCFA')
  })

  it('détail : bénéficiaire, auteur, montant et motif tels que renvoyés', () => {
    const rows = Object.fromEntries(buildDetailRows(original).map((row) => [row.label, row.value]))
    expect(rows['Bénéficiaire']).toBe('Cheikh Sow')
    expect(rows['Enregistré par']).toBe('Mohamed Bakhoum')
    expect(rows.Montant.replace(/\s/g, ' ')).toBe('25 000 FCFA')
    expect(rows['Date du retrait']).toBe('18/12/2026')
    expect(rows.Motif).toBe('Loyer')
    expect(Object.fromEntries(buildDetailRows({ ...original, reason: null }).map((row) => [row.label, row.value])).Motif).toMatch(/Aucun motif/)
  })
})

describe('actions d’écriture : double soumission, erreurs, actualisation', () => {
  function setup(overrides = {}) {
    const state = { mutations: [], refreshes: 0, calls: [], keys: 0 }
    const api = {
      create: async (payload, key) => { state.calls.push(['create', payload, key]); return { withdrawal: { id: 'w1' } } },
      update: async (id, changes) => { state.calls.push(['update', id, changes]); return { withdrawal: { id } } },
      remove: async (id, reason) => { state.calls.push(['remove', id, reason]); return { id, deleted: true } },
      ...overrides,
    }
    const actions = createWithdrawalActions({ api, setMutation: (value) => state.mutations.push(value), refresh: () => { state.refreshes += 1 }, generateKey: () => `key-${++state.keys}` })
    return { state, actions }
  }
  const gate = () => {
    let release
    const promise = new Promise((resolve) => { release = resolve })
    return { promise, release }
  }

  it('création réussie : un seul appel, clé d’idempotence, actualisation, état repassé à idle', async () => {
    const { state, actions } = setup()
    const result = await actions.create(valid)
    expect(result).toMatchObject({ ok: true, withdrawal: { id: 'w1' } })
    expect(state.calls).toEqual([['create', { beneficiaryId: CHEIKH, amount: 25000, withdrawalDate: '2026-12-18', reason: 'Loyer' }, 'key-1']])
    expect(state.refreshes).toBe(1)
    expect(state.mutations[0].status).toBe('submitting')
    expect(state.mutations.at(-1)).toEqual(IDLE_MUTATION)
  })

  it('double soumission : le second clic pendant l’envoi est ignoré, une seule requête part', async () => {
    const hold = gate()
    const { state, actions } = setup({ create: async (payload, key) => { state.calls.push(['create', key]); await hold.promise; return { withdrawal: { id: 'w1' } } } })
    const first = actions.create(valid)
    const second = await actions.create(valid)
    expect(second).toMatchObject({ ok: false, ignored: true })
    expect(actions.isBusy()).toBe(true)
    hold.release()
    expect((await first).ok).toBe(true)
    expect(state.calls).toHaveLength(1)
    expect(state.refreshes).toBe(1)
    expect(actions.isBusy()).toBe(false)
  })

  it('échec : erreur affichable, aucune actualisation, même clé pour la même saisie, nouvelle clé si la saisie change, nouvelle clé après succès', async () => {
    let attempt = 0
    const { state, actions } = setup({
      create: async (payload, key) => {
        state.calls.push(key)
        attempt += 1
        if (attempt === 1) throw Object.assign(new Error('x'), { status: 409, code: 'INSUFFICIENT_TREASURY', message: 'Trésorerie insuffisante.' })
        return { withdrawal: { id: 'w1' } }
      },
    })
    const failed = await actions.create(valid)
    expect(failed.ok).toBe(false)
    expect(state.mutations.at(-1).status).toBe('error')
    expect(state.mutations.at(-1).message).toMatch(/trésorerie disponible/)
    expect(state.refreshes).toBe(0)
    await actions.create(valid) // même saisie : même clé (rejeu côté serveur possible)
    expect(state.calls).toEqual(['key-1', 'key-1'])
    await actions.create({ ...valid, amount: '1000' }) // saisie différente : nouvelle clé
    await actions.create({ ...valid, amount: '1000' }) // identique à un retrait déjà enregistré : NOUVEAU retrait, nouvelle clé
    expect(state.calls).toEqual(['key-1', 'key-1', 'key-2', 'key-3'])
  })

  it('erreurs de champ du serveur transmises au formulaire', async () => {
    const { state, actions } = setup({ create: async () => { throw Object.assign(new Error('x'), { status: 400, code: 'VALIDATION_ERROR', fields: [{ field: 'amount', message: 'Montant trop élevé.' }] }) } })
    await actions.create(valid)
    expect(state.mutations.at(-1).fieldErrors).toEqual({ amount: 'Montant trop élevé.' })
  })

  it('modification : seuls les champs changés sont envoyés, actualisation ensuite ; sans changement, rien n’est envoyé', async () => {
    const { state, actions } = setup()
    const noChange = await actions.update('w1', buildEditValues(original), original)
    expect(noChange).toMatchObject({ ok: false, noChange: true })
    expect(state.calls).toHaveLength(0)
    expect(state.mutations.at(-1).message).toMatch(/Aucune modification/)
    const changed = await actions.update('w1', { ...buildEditValues(original), amount: '30000' }, original)
    expect(changed.ok).toBe(true)
    expect(state.calls).toEqual([['update', 'w1', { amount: 30000 }]])
    expect(state.refreshes).toBe(1)
  })

  it('suppression logique : motif nettoyé ou absent, actualisation ensuite ; échec = pas d’actualisation', async () => {
    const { state, actions } = setup()
    expect((await actions.remove('w1', '  Doublon ')).ok).toBe(true)
    expect((await actions.remove('w2', '   ')).ok).toBe(true)
    expect(state.calls).toEqual([['remove', 'w1', 'Doublon'], ['remove', 'w2', null]])
    expect(state.refreshes).toBe(2)
    const failing = setup({ remove: async () => { throw Object.assign(new Error('x'), { status: 404, code: 'WITHDRAWAL_NOT_FOUND' }) } })
    const result = await failing.actions.remove('w9', '')
    expect(result.ok).toBe(false)
    expect(failing.state.refreshes).toBe(0)
    expect(failing.state.mutations.at(-1).message).toMatch(/déjà été supprimé|n'existe plus/)
  })
})
