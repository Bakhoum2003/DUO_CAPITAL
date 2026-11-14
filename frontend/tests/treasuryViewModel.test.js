import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTERS, DIRECTION_OPTIONS, SORT_OPTIONS, TYPE_META, TYPE_OPTIONS, buildDetailRows, buildFormulaRows, buildMovementsPath, buildSpendingRows,
  buildSummaryCards, formatLastMovement, formatMonthKey, formatMoney, formatMovementAmount, getTypeMeta, hasActiveFilters, isHttpUrl, movementPath, validateFilters,
} from '../src/utils/treasuryViewModel'

const summary = {
  balance: 45000, inflow: 90000, outflow: 45000, asOf: '2026-12-20',
  contributions: { amount: 70000, count: 2 }, revenues: { amount: 20000, count: 1 }, investments: { amount: 30000, count: 1 }, expenses: { amount: 5000, count: 1 }, withdrawals: { amount: 10000, count: 1 },
  components: [
    { type: 'CONTRIBUTION', label: 'Cotisations encaissées', effect: 'INCREASE', amount: 70000, count: 2 },
    { type: 'WITHDRAWAL', label: 'Retraits', effect: 'DECREASE', amount: 10000, count: 1 },
  ],
}

describe('formatage des montants (FCFA)', () => {
  it('montant, zéro et déficit (jamais masqué)', () => {
    expect(formatMoney(45000).replace(/\s/g, ' ')).toBe('45 000 FCFA')
    expect(formatMoney(0)).toBe('0 FCFA')
    expect(formatMoney(-10000).startsWith('−')).toBe(true)
    expect(formatMoney(-10000)).toContain('FCFA')
    expect(formatMoney(undefined)).toBe('—')
    expect(formatMoney(Number.NaN)).toBe('—')
  })

  it('montant d’un mouvement avec son sens', () => {
    expect(formatMovementAmount(20000, 'IN').startsWith('+ ')).toBe(true)
    expect(formatMovementAmount(5000, 'OUT').startsWith('− ')).toBe(true)
    expect(formatMovementAmount(5000, 'OUT')).toContain('FCFA')
  })

  it('dernier mouvement et mois', () => {
    expect(formatLastMovement('2026-12-18')).toBe('18/12/2026')
    expect(formatLastMovement(null)).toBe('Aucun mouvement')
    expect(formatMonthKey('2026-12').toLowerCase()).toContain('décembre')
    expect(formatMonthKey('bizarre')).toBe('bizarre')
  })
})

describe('types et sens', () => {
  it('cinq types : sens et libellés ; entrées = cotisation et recette ; sorties = investissement, dépense, retrait', () => {
    expect(Object.keys(TYPE_META)).toEqual(['CONTRIBUTION', 'REVENUE', 'INVESTMENT', 'EXPENSE', 'WITHDRAWAL'])
    expect(Object.entries(TYPE_META).filter(([, meta]) => meta.direction === 'IN').map(([type]) => type)).toEqual(['CONTRIBUTION', 'REVENUE'])
    expect(Object.entries(TYPE_META).filter(([, meta]) => meta.direction === 'OUT').map(([type]) => type)).toEqual(['INVESTMENT', 'EXPENSE', 'WITHDRAWAL'])
    expect(getTypeMeta('INVESTMENT').label).not.toBe(getTypeMeta('EXPENSE').label)
    expect(getTypeMeta('???').label).toBe('Mouvement')
    expect(TYPE_OPTIONS).toHaveLength(6)
    expect(DIRECTION_OPTIONS.map((o) => o.value)).toEqual(['', 'IN', 'OUT'])
    expect(SORT_OPTIONS.map((o) => o.value)).toEqual(['date_desc', 'date_asc', 'amount_desc', 'amount_asc'])
  })
})

describe('filtres et adresse', () => {
  it('filtres actifs et réinitialisation', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: 'amount_asc', page: 3 })).toBe(false)
    for (const key of ['search', 'type', 'direction', 'category', 'partnerId', 'from', 'to']) expect(hasActiveFilters({ ...DEFAULT_FILTERS, [key]: 'x' })).toBe(true)
  })

  it('dates incohérentes ou invalides détectées', () => {
    expect(validateFilters(DEFAULT_FILTERS)).toBeNull()
    expect(validateFilters({ ...DEFAULT_FILTERS, from: '2026-12-10', to: '2026-12-01' })).toMatch(/précéder/)
    expect(validateFilters({ ...DEFAULT_FILTERS, from: 'hier' })).toMatch(/début/)
    expect(validateFilters({ ...DEFAULT_FILTERS, to: '12/2026' })).toMatch(/fin/)
    expect(validateFilters({ ...DEFAULT_FILTERS, from: '2026-12-01', to: '2026-12-01' })).toBeNull()
  })

  it("les caractères spéciaux de la recherche sont encodés ; le détail encode ses segments", () => {
    const url = buildMovementsPath({ ...DEFAULT_FILTERS, search: 'a&b=c #1' })
    expect(new URL(url, 'http://x').searchParams.get('search')).toBe('a&b=c #1')
    expect(movementPath('EXPENSE', 'a/b')).toBe('/api/v1/treasury/movements/EXPENSE/a%2Fb')
  })
})

describe('cartes de synthèse : valeurs de l’API, jamais recalculées', () => {
  it('six informations : solde, entrées, sorties, cotisations, recettes ; investissements et dépenses séparés', () => {
    const cards = buildSummaryCards(summary)
    expect(cards.map((c) => c.id)).toEqual(['balance', 'inflow', 'outflow', 'contributions', 'revenues'])
    expect(cards[0].valueLabel).toContain('45')
    expect(cards[0].tone).toBe('green')
    expect(cards[1].valueLabel).toContain('90')
    expect(cards[2].valueLabel).toContain('45')
    const rows = buildSpendingRows(summary)
    expect(rows.map((r) => [r.id, r.count])).toEqual([['investments', 1], ['expenses', 1]])
    expect(rows[0].amountLabel).toContain('30')
    expect(rows[1].amountLabel).toContain('5')
  })

  it('solde négatif : carte rouge et signe conservé ; synthèse absente : « — », jamais un faux 0', () => {
    const negative = buildSummaryCards({ ...summary, balance: -2500 })
    expect(negative[0].tone).toBe('red')
    expect(negative[0].valueLabel.startsWith('−')).toBe(true)
    const none = buildSummaryCards(null)
    expect(none.every((card) => card.valueLabel === '—')).toBe(true)
    expect(buildSpendingRows(null)).toEqual([])
  })

  it('décomposition : signe selon l’effet fourni par l’API', () => {
    const rows = buildFormulaRows(summary.components)
    expect(rows.map((r) => [r.id, r.sign, r.increases])).toEqual([['CONTRIBUTION', '+', true], ['WITHDRAWAL', '−', false]])
    expect(buildFormulaRows(undefined)).toEqual([])
  })
})

describe('détail d’un mouvement : uniquement ce que l’API renvoie', () => {
  const base = { type: 'WITHDRAWAL', direction: 'OUT', amount: 10000, date: '2026-12-18', description: 'Retrait', category: null, activity: null, partner: { name: 'Cheikh Sow' }, recordedBy: { name: 'Cheikh Sow' }, countedInBalance: true, details: { reason: 'Besoin personnel' } }

  it('champs présents affichés, champs absents omis (rien n’est inventé)', () => {
    const labels = buildDetailRows(base).map((row) => row.label)
    expect(labels).toContain('Motif du retrait')
    expect(labels).toContain('Associé concerné')
    expect(labels).not.toContain('Activité')
    expect(labels).not.toContain('Catégorie')
    expect(labels).not.toContain('Note')
    expect(labels).not.toContain('Justificatif')
    expect(buildDetailRows(base).find((row) => row.label === 'Pris en compte dans le solde').value).toBe('Oui')
  })

  it('cotisation, investissement avec justificatif, mouvement futur', () => {
    const contribution = buildDetailRows({ ...base, type: 'CONTRIBUTION', direction: 'IN', details: { period: '2026-12', note: 'Virement' } })
    expect(contribution.find((r) => r.label === 'Mois concerné').value).toBe('2026-12')
    expect(contribution.find((r) => r.label === 'Note').value).toBe('Virement')
    const investment = buildDetailRows({ ...base, type: 'INVESTMENT', activity: { name: 'Pagnes Wax' }, category: 'Textile', details: { receipt: { reference: 'FAC-1', url: 'https://x.sn/f' } } })
    expect(investment.find((r) => r.label === 'Activité').value).toBe('Pagnes Wax')
    expect(investment.find((r) => r.label === 'Justificatif').value).toBe('FAC-1')
    const future = buildDetailRows({ ...base, countedInBalance: false })
    expect(future.find((r) => r.label === 'Pris en compte dans le solde').value).toMatch(/^Non/)
  })

  it('les liens de justificatif ne sont affichés que pour http(s)', () => {
    expect([isHttpUrl('https://x.sn/f'), isHttpUrl('http://x.sn'), isHttpUrl('javascript:alert(1)'), isHttpUrl('data:text/html,x'), isHttpUrl(null), isHttpUrl('')]).toEqual([true, true, false, false, false, false])
  })
})
