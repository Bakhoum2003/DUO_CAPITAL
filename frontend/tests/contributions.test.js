import { describe, expect, it } from 'vitest'
import { createContributionSubmitter } from '../src/utils/contributionSubmitter'
import {
  DEFAULT_FILTERS, buildCreatePayload, buildContributionsPath, buildMonthRows, buildPartnerProgress, buildPeriodOptions, buildStatCards,
  describeCreateError, hasActiveFilters, parseAmountInput, todayInDakar, validateFilters, validateRecordForm,
} from '../src/utils/contributionsViewModel'

const MOHAMED = { partnerId: 'p1', name: 'Mohamed Bakhoum', partnerNumber: 1, monthlyTarget: 15000, paid: 20000, contributionsCount: 1, expected: 15000, settled: 15000, remaining: 0, excess: 5000, realizationRate: 100, monthsCount: 1, paidMonths: 1, overdueMonths: [] }
const CHEIKH = { partnerId: 'p2', name: 'Cheikh Sow', partnerNumber: 2, monthlyTarget: 15000, paid: 6000, contributionsCount: 2, expected: 15000, settled: 6000, remaining: 9000, excess: 0, realizationRate: 40, monthsCount: 1, paidMonths: 0, overdueMonths: ['2026-11'] }
const summary = (patch = {}) => ({
  expectedAvailable: true, fundStarted: true, fundStartPeriod: '2026-12', monthsCount: 1, monthlyTargetCollective: 30000,
  partners: [MOHAMED, CHEIKH],
  collective: { paid: 26000, contributionsCount: 3, expected: 30000, objective: 30000, settled: 21000, remaining: 9000, excess: 5000, realizationRate: 70 },
  months: [{ period: '2026-12', isCurrent: true, target: 30000, paid: 26000, settled: 21000, remaining: 9000, isComplete: false, isOverdue: false, partners: [{ partnerId: 'p1', paid: 20000, settled: 15000, status: 'PAID' }, { partnerId: 'p2', paid: 6000, settled: 6000, status: 'PARTIAL' }] }],
  ...patch,
})
const context = { todayIso: '2026-12-20', fundStartPeriod: '2026-12', partnerIds: ['p1', 'p2'] }
const valid = { partnerId: 'p1', amount: '15 000', contributionDate: '2026-12-05', period: '2026-12', note: '' }

describe('statistiques affichées', () => {
  it('six cartes issues de l\'API, noms dynamiques, total réel non plafonné', () => {
    const cards = Object.fromEntries(buildStatCards(summary()).map((card) => [card.id, card]))
    expect(Object.keys(cards)).toEqual(['total', 'p1', 'p2', 'objective', 'remaining', 'rate'])
    expect(cards.p1.title).toBe('Cotisations de Mohamed Bakhoum')
    expect(cards.p2.title).toBe('Cotisations de Cheikh Sow')
    expect(cards.total.valueLabel).toContain('26')
    expect(cards.p1.valueLabel).toContain('20')
    expect(cards.rate.valueLabel).toContain('70')
    expect(cards.remaining.footnote).toMatch(/Excédent/)
  })

  it('objectifs non calculables : « Non calculable », jamais 0', () => {
    const data = summary({ expectedAvailable: false, collective: { paid: 0, contributionsCount: 0, expected: null, objective: null, remaining: null, excess: null, realizationRate: null } })
    const cards = Object.fromEntries(buildStatCards(data).map((card) => [card.id, card]))
    expect(cards.objective.valueLabel).toBe('Non calculable')
    expect(cards.remaining.valueLabel).toBe('Non calculable')
    expect(cards.rate.valueLabel).toBe('—')
  })

  it('suivi des deux associés : montant versé réel, restant, progression, mois en retard', () => {
    const [a, b] = [MOHAMED, CHEIKH].map(buildPartnerProgress)
    expect([a.initials, a.percent, a.isComplete]).toEqual(['MB', 100, true])
    expect(a.paid).toBe(20000)
    expect(a.excess).toBe(5000)
    expect([b.initials, b.percent, b.isComplete, b.remaining]).toEqual(['CS', 40, false, 9000])
    expect(b.overdueMonths).toEqual(['2026-11'])
  })

  it('suivi mensuel : statut collectif et par associé', () => {
    const [row] = buildMonthRows(summary())
    expect(row.state).toBe('IN_PROGRESS')
    expect(row.partners.map((p) => p.statusLabel)).toEqual(['Réglé', 'Partiel'])
    const overdue = buildMonthRows(summary({ months: [{ ...summary().months[0], isCurrent: false, isOverdue: true }] }))[0]
    expect(overdue.state).toBe('OVERDUE')
  })

  it('état vide : aucune carte inventée, zéros réels', () => {
    const empty = summary({ partners: [{ ...MOHAMED, paid: 0, contributionsCount: 0 }, { ...CHEIKH, paid: 0, contributionsCount: 0 }], collective: { paid: 0, contributionsCount: 0, expected: 0, objective: 0, settled: 0, remaining: 0, excess: 0, realizationRate: null }, fundStarted: false, monthsCount: 0, months: [] })
    expect(buildStatCards(empty)[0].valueLabel).toContain('0')
    expect(buildMonthRows(empty)).toEqual([])
  })
})

describe('filtres', () => {
  it('construisent l\'URL avec les seuls filtres renseignés (jamais d\'identité)', () => {
    expect(buildContributionsPath(DEFAULT_FILTERS)).toBe('/api/v1/contributions?page=1&pageSize=20')
    expect(buildContributionsPath({ ...DEFAULT_FILTERS, partnerId: 'p2', period: '2026-12', year: '2026', from: '2026-12-01', to: '2026-12-31', page: 3 })).toBe(
      '/api/v1/contributions?partnerId=p2&period=2026-12&year=2026&from=2026-12-01&to=2026-12-31&page=3&pageSize=20',
    )
  })
  it('détectent les filtres actifs et les dates incohérentes', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, partnerId: 'p1' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, page: 4 })).toBe(false)
    expect(validateFilters({ ...DEFAULT_FILTERS, from: '2026-12-10', to: '2026-12-01' })).toMatch(/précéder/)
    expect(validateFilters({ ...DEFAULT_FILTERS, from: '2026-12-01', to: '2026-12-10' })).toBeNull()
  })
  it('liste des mois : du mois courant au démarrage du fonds, vide avant le démarrage', () => {
    expect(buildPeriodOptions('2026-11', '2027-01').map((o) => o.value)).toEqual(['2027-01', '2026-12', '2026-11'])
    expect(buildPeriodOptions('2026-12', '2026-11')).toEqual([])
    expect(buildPeriodOptions(null, '2026-11')).toEqual([])
  })
  it('« aujourd\'hui » suit Africa/Dakar', () => {
    expect(todayInDakar(new Date('2026-12-20T23:59:00Z'))).toBe('2026-12-20')
    expect(todayInDakar(new Date('2026-12-21T00:01:00Z'))).toBe('2026-12-21')
  })
})

describe('validation du formulaire', () => {
  it('accepte une saisie valide et les montants supérieurs à 15 000', () => {
    expect(validateRecordForm(valid, context)).toEqual({})
    expect(validateRecordForm({ ...valid, amount: '20 000' }, context)).toEqual({})
    expect(parseAmountInput('20 000')).toBe(20000)
    expect(buildCreatePayload({ ...valid, amount: '20 000', note: '  Virement ' }).amount).toBe(20000)
    expect(buildCreatePayload({ ...valid, amount: '20 000', note: '  Virement ' }).note).toBe('Virement')
  })

  it.each([
    ['montant vide', { amount: '' }, 'amount'],
    ['montant nul', { amount: '0' }, 'amount'],
    ['montant négatif', { amount: '-5' }, 'amount'],
    ['montant décimal', { amount: '10,5' }, 'amount'],
    ['montant texte', { amount: 'abc' }, 'amount'],
    ['associé manquant', { partnerId: '' }, 'partnerId'],
    ['associé inconnu', { partnerId: 'zzz' }, 'partnerId'],
    ['date manquante', { contributionDate: '' }, 'contributionDate'],
    ['date future', { contributionDate: '2026-12-21' }, 'contributionDate'],
    ['date avant le fonds', { contributionDate: '2026-11-30' }, 'contributionDate'],
    ['mois manquant', { period: '' }, 'period'],
    ['mois avant le fonds', { period: '2026-11' }, 'period'],
    ['mois futur', { period: '2027-01' }, 'period'],
    ['note trop longue', { note: 'x'.repeat(301) }, 'note'],
  ])('refuse : %s', (_label, patch, field) => {
    expect(validateRecordForm({ ...valid, ...patch }, context)[field]).toBeTruthy()
  })

  it('la note vide n\'est pas envoyée ; la confirmation n\'est envoyée que si demandée', () => {
    expect('note' in buildCreatePayload(valid)).toBe(false)
    expect('confirmDuplicate' in buildCreatePayload(valid)).toBe(false)
    expect(buildCreatePayload(valid, { confirmDuplicate: true }).confirmDuplicate).toBe(true)
  })
})

describe('erreurs de l\'API', () => {
  it('rattachent les erreurs aux champs et signalent un doublon suspecté', () => {
    const detail = describeCreateError({ code: 'VALIDATION_ERROR', message: 'Invalide', fields: [{ field: 'amount', message: 'Montant invalide' }, { field: 'inconnu', message: 'x' }] })
    expect(detail.fieldErrors).toEqual({ amount: 'Montant invalide' })
    expect(describeCreateError({ code: 'DUPLICATE_SUSPECTED', message: 'Doublon' }).needsDuplicateConfirmation).toBe(true)
    expect(describeCreateError({ code: 'NETWORK_ERROR', message: 'Impossible de joindre le serveur.' }).message).toMatch(/serveur/)
    expect(describeCreateError(null).message).toBeTruthy()
  })
})

describe('envoi sans double soumission', () => {
  const payload = { partnerId: 'p1', amount: 15000, contributionDate: '2026-12-05', period: '2026-12' }
  const deferred = () => {
    let resolve, reject
    const promise = new Promise((res, rej) => ((resolve = res), (reject = rej)))
    return { promise, resolve, reject }
  }

  it('deux clics pendant l\'envoi : une seule requête', async () => {
    const calls = []
    const gate = deferred()
    const submitter = createContributionSubmitter({ create: (body, key) => (calls.push({ body, key }), gate.promise), generateKey: () => 'cle-test-0001' })
    const first = submitter.submit(payload)
    const second = submitter.submit(payload)
    expect(submitter.isSubmitting()).toBe(true)
    gate.resolve({ contribution: { id: 'c1' } })
    const [a, b] = await Promise.all([first, second])
    expect(calls).toHaveLength(1)
    expect(a).toEqual(b)
    expect(a).toEqual({ ok: true, contribution: { id: 'c1' } })
    expect(submitter.isSubmitting()).toBe(false)
  })

  it('même clé après un échec réseau (nouvelle tentative sûre), nouvelle clé après un succès', async () => {
    const keys = []
    let attempt = 0
    let counter = 0
    const submitter = createContributionSubmitter({
      create: async (_body, key) => {
        keys.push(key)
        attempt += 1
        if (attempt === 1) throw Object.assign(new Error('réseau'), { code: 'NETWORK_ERROR' })
        return { contribution: { id: `c${attempt}` } }
      },
      generateKey: () => `cle-test-${String(++counter).padStart(4, '0')}`,
    })
    expect((await submitter.submit(payload)).ok).toBe(false)
    expect((await submitter.submit(payload)).ok).toBe(true)
    expect(keys[0]).toBe(keys[1]) // l'éventuel premier envoi serait rejoué par le serveur, pas dupliqué
    expect((await submitter.submit(payload)).ok).toBe(true) // versement identique volontaire après succès
    expect(keys[2]).not.toBe(keys[1])
  })

  it('un contenu modifié change la clé', async () => {
    const keys = []
    let counter = 0
    const submitter = createContributionSubmitter({ create: async (_b, key) => (keys.push(key), Promise.reject(new Error('x'))), generateKey: () => `cle-test-${++counter}0000` })
    await submitter.submit(payload)
    await submitter.submit({ ...payload, amount: 20000 })
    expect(keys[0]).not.toBe(keys[1])
  })

  it('rien n\'est considéré comme enregistré sans confirmation du serveur', async () => {
    const submitter = createContributionSubmitter({ create: async () => { throw Object.assign(new Error('refusé'), { status: 422 }) }, generateKey: () => 'cle-test-0002' })
    const result = await submitter.submit(payload)
    expect(result.ok).toBe(false)
    expect(result.contribution).toBeUndefined()
  })
})
