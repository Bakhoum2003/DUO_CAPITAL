import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTERS, PAGE_SIZE_OPTIONS, PERIOD_OPTIONS, SORT_OPTIONS, buildFilterOptions, buildHistoryPath, buildOperationRows, buildSummaryCards, filtersReducer, hasActiveFilters, operationPath, validateFilters,
} from '../src/utils/historyViewModel'

const MOHAMED = 'a'.repeat(24)
const summary = {
  asOf: '2026-12-20',
  totals: {
    contributions: { amount: 70000, count: 2 }, revenues: { amount: 20000, count: 1 }, investments: { amount: 30000, count: 1 }, expenses: { amount: 5000, count: 1 }, withdrawals: { amount: 10000, count: 1 },
    inflow: 90000, outflow: 45000, net: 45000, operationsCount: 6,
  },
  commercialResult: { revenues: 20000, expenses: 5000, amount: 15000, kind: 'PROFIT', isProvisional: true },
  partners: [{ id: MOHAMED, name: 'Mohamed Bakhoum', partnerNumber: 1 }],
  activities: [{ id: 'b'.repeat(24), name: 'Pagnes Wax', status: 'ACTIVE' }],
}
const nbsp = (text) => text.replace(/\s/g, ' ')

describe('cartes : valeurs de l’API, jamais recalculées, au format FCFA', () => {
  it('quatre cartes principales', () => {
    const { main } = buildSummaryCards(summary)
    expect(main.map((card) => card.id)).toEqual(['inflow', 'outflow', 'net', 'count'])
    expect(nbsp(main[0].valueLabel)).toBe('90 000 FCFA')
    expect(nbsp(main[1].valueLabel)).toBe('45 000 FCFA')
    expect(nbsp(main[2].valueLabel)).toBe('45 000 FCFA')
    expect(main[3].valueLabel).toBe('6')
    expect(main[2].tone).toBe('blue')
  })

  it('cartes complémentaires par type et résultat commercial (calcul, pas une entrée)', () => {
    const { extra } = buildSummaryCards(summary)
    expect(extra.map((card) => card.id)).toEqual(['contributions', 'revenues', 'investments', 'expenses', 'withdrawals', 'result'])
    expect(nbsp(extra[0].valueLabel)).toBe('70 000 FCFA')
    expect(extra[0].footnote).toBe('2 opération(s)')
    expect(nbsp(extra[5].valueLabel)).toBe('15 000 FCFA')
    expect(extra[5].footnote).toMatch(/Bénéfice provisoire/)
    expect(extra[5].footnote).toMatch(/pas une entrée/)
  })

  it('perte ou solde négatif : signe conservé et carte rouge', () => {
    const { main, extra } = buildSummaryCards({ ...summary, totals: { ...summary.totals, net: -2500 }, commercialResult: { amount: -300, kind: 'LOSS', isProvisional: false } })
    expect(main[2].valueLabel.startsWith('−')).toBe(true)
    expect(main[2].tone).toBe('red')
    expect(extra[5].valueLabel.startsWith('−')).toBe(true)
    expect(extra[5].footnote).toMatch(/^Perte ·/)
  })

  it('synthèse absente : « — », jamais un faux zéro', () => {
    const { main, extra } = buildSummaryCards(null)
    expect([...main, ...extra].every((card) => card.valueLabel === '—')).toBe(true)
  })

  it('aucune opération : zéros réels de l’API', () => {
    const zero = { amount: 0, count: 0 }
    const { main } = buildSummaryCards({ ...summary, totals: { contributions: zero, revenues: zero, investments: zero, expenses: zero, withdrawals: zero, inflow: 0, outflow: 0, net: 0, operationsCount: 0 } })
    expect(main.map((card) => card.valueLabel)).toEqual(['0 FCFA', '0 FCFA', '0 FCFA', '0'])
  })
})

describe('filtres : recherche, combinaison, réinitialisation, tri', () => {
  it('filtres actifs (période comprise), tri et page ne comptent pas', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: 'amount_asc', page: 3, limit: 50 })).toBe(false)
    for (const key of ['search', 'type', 'direction', 'partnerId', 'activityId', 'from', 'to']) expect(hasActiveFilters({ ...DEFAULT_FILTERS, [key]: 'x' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, period: 'month' })).toBe(true)
  })

  it('options fixes : types, sens, périodes, tris, tailles de page', () => {
    expect(PERIOD_OPTIONS.map((option) => option.value)).toEqual(['all', 'today', 'week', 'month', 'quarter', 'year', 'custom'])
    expect(SORT_OPTIONS.map((option) => option.value)).toEqual(['date_desc', 'date_asc', 'amount_desc', 'amount_asc'])
    expect(PAGE_SIZE_OPTIONS).toEqual([10, 20, 50])
  })

  it('options des associés et des activités venues de la synthèse, avec « Sans activité »', () => {
    const options = buildFilterOptions(summary)
    expect(options.partners.map((option) => option.label)).toEqual(['Tous les associés', 'Mohamed Bakhoum'])
    expect(options.activities.map((option) => option.value)).toEqual(['', 'none', 'b'.repeat(24)])
    expect(buildFilterOptions(null).partners).toHaveLength(1)
  })

  it('période incohérente ou incomplète détectée (requête non envoyée)', () => {
    expect(validateFilters(DEFAULT_FILTERS)).toBeNull()
    expect(validateFilters({ ...DEFAULT_FILTERS, from: '2026-12-10', to: '2026-12-01' })).toMatch(/précéder/)
    expect(validateFilters({ ...DEFAULT_FILTERS, from: 'hier' })).toMatch(/début/)
    expect(validateFilters({ ...DEFAULT_FILTERS, to: '12/2026' })).toMatch(/fin/)
    expect(validateFilters({ ...DEFAULT_FILTERS, period: 'custom' })).toMatch(/personnalisée/)
    expect(validateFilters({ ...DEFAULT_FILTERS, period: 'custom', from: '2026-12-01' })).toBeNull()
  })

  it('adresse : filtres combinés encodés ; segments du détail encodés', () => {
    const url = buildHistoryPath({ ...DEFAULT_FILTERS, search: 'a&b=c #1', type: 'REVENUE', direction: 'IN' })
    const params = new URL(url, 'http://x').searchParams
    expect(params.get('search')).toBe('a&b=c #1')
    expect(params.get('type')).toBe('REVENUE')
    expect(params.get('direction')).toBe('IN')
    expect(params.get('period')).toBeNull()
    expect(operationPath('EXPENSE', 'a/b')).toBe('/api/v1/history/EXPENSE/a%2Fb')
  })
})

describe('réducteur des filtres (logique du hook) : tri et pagination', () => {
  it('un filtre, une recherche, un tri ou une taille de page ramènent à la page 1', () => {
    let state = filtersReducer(DEFAULT_FILTERS, { type: 'page', page: 4 })
    expect(state.page).toBe(4)
    for (const [name, value] of [['type', 'EXPENSE'], ['search', 'café'], ['sort', 'amount_desc'], ['limit', 50], ['period', 'month']]) {
      state = filtersReducer({ ...state, page: 4 }, { type: 'set', name, value })
      expect(state[name]).toBe(value)
      expect(state.page).toBe(1)
    }
  })

  it('changer de page conserve les filtres ; réinitialiser restaure les valeurs par défaut', () => {
    const filtered = filtersReducer(filtersReducer(DEFAULT_FILTERS, { type: 'set', name: 'direction', value: 'OUT' }), { type: 'set', name: 'sort', value: 'amount_asc' })
    const paged = filtersReducer(filtered, { type: 'page', page: 3 })
    expect(paged).toMatchObject({ direction: 'OUT', sort: 'amount_asc', page: 3 })
    expect(filtersReducer(paged, { type: 'reset' })).toEqual(DEFAULT_FILTERS)
    expect(filtersReducer(paged, { type: 'inconnue' })).toBe(paged)
  })
})

describe('détail : uniquement ce que l’API renvoie', () => {
  const operation = { id: 'w1', type: 'WITHDRAWAL', direction: 'OUT', amount: 10000, date: '2026-12-18', description: 'Besoin personnel', category: null, activity: null, partner: { name: 'Cheikh Sow' }, recordedBy: { name: 'Mohamed Bakhoum' }, countedInBalance: true, details: { reason: 'Besoin personnel' } }

  it('type, identifiant, date, montant, description, associé, auteur ; champs absents omis', () => {
    const rows = Object.fromEntries(buildOperationRows(operation).map((row) => [row.label, row.value]))
    expect(rows.Type).toBe('Retrait')
    expect(rows.Identifiant).toBe('w1')
    expect(rows['Date effective']).toBe('18/12/2026')
    expect(nbsp(rows.Montant)).toBe('− 10 000 FCFA')
    expect(rows.Description).toBe('Besoin personnel')
    expect(rows['Associé concerné']).toBe('Cheikh Sow')
    expect(rows['Enregistré par']).toBe('Mohamed Bakhoum')
    expect('Activité' in rows).toBe(false)
    expect('Justificatif' in rows).toBe(false)
  })

  it('opération avec activité et justificatif ; opération future signalée non comptabilisée', () => {
    const rows = Object.fromEntries(buildOperationRows({ ...operation, type: 'INVESTMENT', activity: { name: 'Pagnes Wax' }, category: 'Textile', details: { receipt: { reference: 'FAC-1' } }, countedInBalance: false }).map((row) => [row.label, row.value]))
    expect(rows['Activité']).toBe('Pagnes Wax')
    expect(rows.Justificatif).toBe('FAC-1')
    expect(rows['Pris en compte dans le solde']).toMatch(/^Non/)
  })
})
