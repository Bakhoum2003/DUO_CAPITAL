import { describe, expect, it } from 'vitest'
import { buildComponents, buildDirectories, computeTreasury, findMovementDetail, listMovements, MOVEMENT_TYPES, TYPE_LABELS } from '../../../src/services/treasury/ledger.js'
import { listMovementsQuerySchema, movementTypeParamSchema } from '../../../src/validation/treasury.schemas.js'

const TODAY = '2026-12-20'
const users = [
  { _id: 'u1', name: 'Mohamed Bakhoum', partnerNumber: 1 },
  { _id: 'u2', name: 'Cheikh Sow', partnerNumber: 2 },
]
const businesses = [
  { _id: 'b1', name: 'Pagnes Wax', category: 'Textile', status: 'ACTIVE' },
  { _id: 'b2', name: 'Café Touba', category: 'Alimentation', status: 'SUSPENDED' },
]
const sources = {
  users,
  businesses,
  contributions: [
    { _id: 'c1', partner: 'u1', amount: 40000, contributionDate: '2026-12-05', period: '2026-12', note: 'Virement', recordedBy: 'u1', createdAt: new Date('2026-12-05T09:00:00Z') },
    { _id: 'c2', partner: 'u2', amount: 30000, contributionDate: '2026-12-06', period: '2026-12', note: null, recordedBy: 'u2', createdAt: new Date('2026-12-06T09:00:00Z') },
    { _id: 'c3', partner: 'u1', amount: 15000, contributionDate: '2027-01-05', period: '2027-01', note: null, recordedBy: 'u1', createdAt: new Date('2026-12-07T09:00:00Z') }, // futur
  ],
  operations: [
    { _id: 'o1', business: 'b1', type: 'INVESTMENT', amount: 30000, operationDate: '2026-12-10', description: 'Achat de tissus', concernedPartner: 'u1', recordedBy: 'u1', createdAt: new Date('2026-12-10T09:00:00Z'), receipt: { reference: 'FAC-1', url: 'https://exemple.sn/f1' } },
    { _id: 'o2', business: 'b1', type: 'EXPENSE', amount: 5000, operationDate: '2026-12-12', description: 'Transport', concernedPartner: null, recordedBy: 'u2', createdAt: new Date('2026-12-12T09:00:00Z'), receipt: null },
    { _id: 'o3', business: 'b2', type: 'REVENUE', amount: 20000, operationDate: '2026-12-15', description: 'Vente café', concernedPartner: 'u2', recordedBy: 'u2', createdAt: new Date('2026-12-15T09:00:00Z'), receipt: null },
  ],
  withdrawals: [{ _id: 'w1', beneficiary: 'u2', amount: 10000, withdrawalDate: '2026-12-18', reason: 'Besoin personnel', recordedBy: 'u2', createdAt: new Date('2026-12-18T09:00:00Z') }],
}
const directories = buildDirectories(sources)
const query = (overrides = {}) => listMovementsQuerySchema.parse(overrides)
const list = (overrides) => listMovements(sources, directories, query(overrides), TODAY)

describe('solde et totaux', () => {
  const totals = computeTreasury(sources, TODAY)

  it('solde = cotisations + recettes − investissements − dépenses − retraits', () => {
    expect(totals.balance).toBe(40000 + 30000 + 20000 - 30000 - 5000 - 10000)
    expect(totals.balance).toBe(45000)
  })

  it('entrées et sorties', () => {
    expect(totals.inflow).toBe(90000)
    expect(totals.outflow).toBe(45000)
    expect(totals.balance).toBe(totals.inflow - totals.outflow)
  })

  it('investissements et dépenses restent distincts ; chaque mouvement compté une seule fois', () => {
    expect(totals.contributions).toEqual({ amount: 70000, count: 2 })
    expect(totals.revenues).toEqual({ amount: 20000, count: 1 })
    expect(totals.investments).toEqual({ amount: 30000, count: 1 })
    expect(totals.expenses).toEqual({ amount: 5000, count: 1 })
    expect(totals.withdrawals).toEqual({ amount: 10000, count: 1 })
    expect(totals.movementsCount).toBe(6)
  })

  it('le mouvement futur est ignoré et signalé, jamais compté', () => {
    expect(totals.futureIgnored).toEqual({ count: 1, amount: 15000 })
    expect(computeTreasury(sources, '2027-01-05').balance).toBe(60000)
    expect(computeTreasury(sources, '2027-01-04').balance).toBe(45000)
  })

  it('dernier mouvement ; décomposition avec le sens de chaque ligne ; bénéfice jamais ajouté en plus', () => {
    expect(totals.lastMovementDate).toBe('2026-12-18')
    expect(totals.lastRecordedAt).toBe('2026-12-18T09:00:00.000Z')
    const components = buildComponents(totals)
    expect(components.map((c) => [c.type, c.effect])).toEqual([['CONTRIBUTION', 'INCREASE'], ['REVENUE', 'INCREASE'], ['INVESTMENT', 'DECREASE'], ['EXPENSE', 'DECREASE'], ['WITHDRAWAL', 'DECREASE']])
    const recomputed = components.reduce((sum, c) => sum + (c.effect === 'INCREASE' ? c.amount : -c.amount), 0)
    expect(recomputed).toBe(totals.balance)
  })

  it("évolution mensuelle : le dernier point égale le solde, aucun solde d'ouverture", () => {
    const { points } = totals.evolution
    expect(points).toHaveLength(1)
    expect(points[0]).toMatchObject({ key: '2026-12', inflow: 90000, outflow: 45000, balance: 45000 })
    const long = computeTreasury(sources, '2027-02-10')
    expect(long.evolution.points.map((p) => p.key)).toEqual(['2026-12', '2027-01', '2027-02'])
    expect(long.evolution.points.at(-1).balance).toBe(long.balance)
  })

  it('aucun mouvement : solde 0, aucune donnée inventée', () => {
    const empty = computeTreasury({ users, businesses, contributions: [], operations: [], withdrawals: [] }, TODAY)
    expect(empty).toMatchObject({ balance: 0, inflow: 0, outflow: 0, movementsCount: 0, lastMovementDate: null, lastRecordedAt: null })
    expect(empty.evolution.points).toEqual([])
  })

  it('un solde négatif est signalé tel quel (jamais masqué à 0)', () => {
    const negative = computeTreasury({ ...sources, contributions: [], operations: [], withdrawals: sources.withdrawals }, TODAY)
    expect(negative.balance).toBe(-10000)
  })
})

describe('historique', () => {
  it('par défaut : mouvements passés uniquement, du plus récent au plus ancien, avec leur origine', () => {
    const { movements, meta } = list()
    expect(movements.map((m) => `${m.type}:${m.id}`)).toEqual(['WITHDRAWAL:w1', 'REVENUE:o3', 'EXPENSE:o2', 'INVESTMENT:o1', 'CONTRIBUTION:c2', 'CONTRIBUTION:c1'])
    expect(meta).toMatchObject({ page: 1, pageSize: 20, total: 6, totalPages: 1 })
    expect(movements.some((m) => m.id === 'c3')).toBe(false)
  })

  it('chaque mouvement : sens, libellé, activité, associé, auteur, date d’enregistrement', () => {
    const revenue = list({ type: 'REVENUE' }).movements[0]
    expect(revenue).toMatchObject({ type: 'REVENUE', typeLabel: 'Recette commerciale', direction: 'IN', amount: 20000, date: '2026-12-15', category: 'Alimentation', countedInBalance: true })
    expect(revenue.activity).toEqual({ id: 'b2', name: 'Café Touba', status: 'SUSPENDED' })
    expect(revenue.partner).toEqual({ id: 'u2', name: 'Cheikh Sow', partnerNumber: 2 })
    expect(revenue.recordedBy.name).toBe('Cheikh Sow')
    expect(revenue.recordedAt).toBe('2026-12-15T09:00:00.000Z')
    expect(list({ type: 'EXPENSE' }).movements[0].partner).toBeNull() // aucune donnée inventée
    expect(list({ type: 'WITHDRAWAL' }).movements[0]).toMatchObject({ direction: 'OUT', activity: null, category: null })
  })

  it('filtre par type, par sens, par catégorie, par associé, par période', () => {
    expect(list({ type: 'CONTRIBUTION' }).meta.total).toBe(2)
    expect(list({ direction: 'IN' }).meta.total).toBe(3)
    expect(list({ direction: 'OUT' }).meta.total).toBe(3)
    expect(list({ category: 'textile' }).movements.map((m) => m.id)).toEqual(['o2', 'o1'])
    expect(list({ partnerId: 'c'.repeat(24) }).meta.total).toBe(0)
    expect(list({ from: '2026-12-10', to: '2026-12-15' }).movements.map((m) => m.id)).toEqual(['o3', 'o2', 'o1'])
    expect(list({ type: 'REVENUE', direction: 'OUT' }).meta.total).toBe(0)
  })

  it('filtre par associé (identifiant)', () => {
    const custom = { ...sources, users: [{ _id: 'a'.repeat(24), name: 'A', partnerNumber: 1 }, { _id: 'b'.repeat(24), name: 'B', partnerNumber: 2 }], contributions: [{ ...sources.contributions[0], partner: 'a'.repeat(24) }], operations: [], withdrawals: [] }
    const result = listMovements(custom, buildDirectories(custom), query({ partnerId: 'a'.repeat(24) }), TODAY)
    expect(result.meta.total).toBe(1)
  })

  it('recherche : sans accent ni casse, dans la description, l’activité, l’associé, la catégorie et le type', () => {
    expect(list({ search: 'CAFE' }).movements.map((m) => m.id)).toEqual(['o3'])
    expect(list({ search: 'transport' }).movements.map((m) => m.id)).toEqual(['o2'])
    expect(list({ search: 'cheikh' }).meta.total).toBe(4)
    expect(list({ search: 'retrait' }).movements.map((m) => m.id)).toEqual(['w1'])
    expect(list({ search: 'textile' }).meta.total).toBe(2)
    expect(list({ search: 'introuvable' }).meta.total).toBe(0)
    expect(list({ search: '.*' }).meta.total).toBe(0) // pas d'expression régulière
  })

  it('tri par date et par montant', () => {
    expect(list({ sort: 'date_asc' }).movements.map((m) => m.id)[0]).toBe('c1')
    expect(list({ sort: 'amount_desc' }).movements.map((m) => m.amount)).toEqual([40000, 30000, 30000, 20000, 10000, 5000])
    expect(list({ sort: 'amount_asc' }).movements.map((m) => m.amount)[0]).toBe(5000)
  })

  it('pagination côté serveur, totaux du filtre complets, catégories pour le filtre', () => {
    const page2 = list({ pageSize: '2', page: '2' })
    expect(page2.movements.map((m) => m.id)).toEqual(['o2', 'o1'])
    expect(page2.meta).toMatchObject({ page: 2, pageSize: 2, total: 6, totalPages: 3 })
    expect(page2.meta.filtered).toEqual({ count: 6, inflow: 90000, outflow: 45000, net: 45000 })
    expect(page2.meta.categories).toEqual(['Alimentation', 'Textile'])
    expect(list({ pageSize: '2', page: '99' }).meta.page).toBe(3) // page hors limites : ramenée à la dernière
    expect(list({ type: 'WITHDRAWAL' }).meta.filtered).toEqual({ count: 1, inflow: 0, outflow: 10000, net: -10000 })
  })
})

describe('détail', () => {
  it('cotisation, opération avec justificatif, retrait : champs de l’enregistrement d’origine seulement', () => {
    expect(findMovementDetail(sources, directories, 'CONTRIBUTION', 'c1', TODAY)).toMatchObject({ signedAmount: 40000, origin: { collection: 'contributions', id: 'c1' }, details: { period: '2026-12', note: 'Virement' } })
    expect(findMovementDetail(sources, directories, 'INVESTMENT', 'o1', TODAY)).toMatchObject({ signedAmount: -30000, origin: { collection: 'operations', id: 'o1' }, details: { receipt: { reference: 'FAC-1', url: 'https://exemple.sn/f1' } } })
    expect(findMovementDetail(sources, directories, 'EXPENSE', 'o2', TODAY).details).toEqual({ receipt: null })
    expect(findMovementDetail(sources, directories, 'WITHDRAWAL', 'w1', TODAY)).toMatchObject({ signedAmount: -10000, details: { reason: 'Besoin personnel' } })
  })

  it('mouvement futur : détail disponible mais signalé « non compté » ; type erroné ou inconnu : null', () => {
    expect(findMovementDetail(sources, directories, 'CONTRIBUTION', 'c3', TODAY)).toMatchObject({ countedInBalance: false })
    expect(findMovementDetail(sources, directories, 'EXPENSE', 'c1', TODAY)).toBeNull()
    expect(findMovementDetail(sources, directories, 'WITHDRAWAL', 'zzz', TODAY)).toBeNull()
  })
})

describe('validation des paramètres', () => {
  it('valeurs par défaut', () => {
    expect(listMovementsQuerySchema.parse({})).toMatchObject({ sort: 'date_desc', page: 1, pageSize: 20 })
  })
  it('refuse les paramètres invalides, inconnus ou incohérents', () => {
    for (const bad of [{ type: 'REFUND' }, { direction: 'SIDE' }, { sort: 'x' }, { pageSize: '101' }, { page: '0' }, { from: '2026-02-30' }, { from: '2026-12-10', to: '2026-12-01' }, { partnerId: 'abc' }, { search: 'x'.repeat(101) }, { foo: '1' }]) {
      expect(listMovementsQuerySchema.safeParse(bad).success).toBe(false)
    }
  })
  it('types et libellés', () => {
    expect(MOVEMENT_TYPES).toEqual(['CONTRIBUTION', 'REVENUE', 'INVESTMENT', 'EXPENSE', 'WITHDRAWAL'])
    expect(Object.keys(TYPE_LABELS)).toEqual(MOVEMENT_TYPES)
    expect(movementTypeParamSchema.safeParse('WITHDRAWAL').success).toBe(true)
    expect(movementTypeParamSchema.safeParse('withdrawal').success).toBe(false)
  })
})
