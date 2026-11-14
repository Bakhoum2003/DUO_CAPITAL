import { describe, expect, it } from 'vitest'
import { toOperationDetail, toOperationView } from '../../../src/services/history/historyView.js'
import { resolveHistoryRange, toLedgerQuery } from '../../../src/services/history/query.js'
import { NO_ACTIVITY } from '../../../src/services/treasury/ledger.js'
import { listHistoryQuerySchema } from '../../../src/validation/history.schemas.js'

const TODAY = '2026-12-20' // dimanche
const ID = 'a'.repeat(24)
const fails = (query) => listHistoryQuerySchema.safeParse(query).success === false

describe('période', () => {
  it('périodes prédéfinies (mêmes intervalles que le Dashboard)', () => {
    expect(resolveHistoryRange({ period: 'all' }, TODAY)).toEqual({ from: null, to: TODAY })
    expect(resolveHistoryRange({ period: 'today' }, TODAY)).toEqual({ from: TODAY, to: TODAY })
    expect(resolveHistoryRange({ period: 'week' }, TODAY)).toEqual({ from: '2026-12-14', to: '2026-12-20' })
    expect(resolveHistoryRange({ period: 'month' }, TODAY)).toEqual({ from: '2026-12-01', to: '2026-12-31' })
    expect(resolveHistoryRange({ period: 'quarter' }, TODAY)).toEqual({ from: '2026-10-01', to: '2026-12-31' })
    expect(resolveHistoryRange({ period: 'year' }, TODAY)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
  })

  it('période personnalisée et resserrement par des dates explicites', () => {
    expect(resolveHistoryRange({ period: 'custom', from: '2026-12-05', to: '2026-12-10' }, TODAY)).toEqual({ from: '2026-12-05', to: '2026-12-10' })
    expect(resolveHistoryRange({ period: 'custom', from: '2026-12-05' }, TODAY)).toEqual({ from: '2026-12-05', to: null })
    expect(resolveHistoryRange({ period: 'month', from: '2026-12-10' }, TODAY)).toEqual({ from: '2026-12-10', to: '2026-12-31' })
    expect(resolveHistoryRange({ period: 'month', to: '2026-12-10' }, TODAY)).toEqual({ from: '2026-12-01', to: '2026-12-10' })
    expect(resolveHistoryRange({ from: '2026-12-03' }, TODAY)).toEqual({ from: '2026-12-03', to: TODAY })
  })

  it('requête de l’Historique traduite pour le registre : limit devient pageSize', () => {
    const query = { search: 'x', type: 'EXPENSE', direction: 'OUT', partnerId: ID, activityId: NO_ACTIVITY, period: 'month', sort: 'amount_desc', page: 3, limit: 50 }
    expect(toLedgerQuery(query, TODAY)).toEqual({ search: 'x', type: 'EXPENSE', direction: 'OUT', partnerId: ID, activityId: NO_ACTIVITY, from: '2026-12-01', to: '2026-12-31', sort: 'amount_desc', page: 3, pageSize: 50 })
    expect(toLedgerQuery({ period: 'all', sort: 'date_desc', page: 1, limit: 20 }, TODAY).from).toBeUndefined()
  })
})

describe('schéma de la requête', () => {
  it('valeurs par défaut', () => {
    expect(listHistoryQuerySchema.parse({})).toEqual({ period: 'all', sort: 'date_desc', page: 1, limit: 20 })
  })

  it('tous les paramètres valides', () => {
    const parsed = listHistoryQuerySchema.parse({ search: ' café ', type: 'REVENUE', direction: 'IN', partnerId: ID, activityId: ID, period: 'custom', from: '2026-12-01', to: '2026-12-31', sort: 'amount_asc', page: '2', limit: '100' })
    expect(parsed).toMatchObject({ search: 'café', type: 'REVENUE', direction: 'IN', period: 'custom', sort: 'amount_asc', page: 2, limit: 100 })
    expect(listHistoryQuerySchema.parse({ activityId: 'none' }).activityId).toBe('none')
  })

  it('valeurs invalides, inconnues ou incohérentes refusées', () => {
    for (const bad of [{ type: 'AUTRE' }, { direction: 'X' }, { partnerId: 'abc' }, { activityId: 'abc' }, { period: 'decade' }, { from: '2026-02-30' }, { sort: 'x' }, { page: '0' }, { limit: '101' }, { limit: 'abc' }, { inconnu: '1' }, { from: '2026-12-10', to: '2026-12-01' }, { period: 'custom' }, { search: 'x'.repeat(101) }]) {
      expect(fails(bad)).toBe(true)
    }
  })
})

describe('vue publique', () => {
  const movement = {
    id: ID, type: 'WITHDRAWAL', typeLabel: 'Retrait', direction: 'OUT', amount: 100, date: '2026-12-01', description: 'Retrait', category: null, activity: null,
    partner: { id: ID, name: 'Cheikh Sow', partnerNumber: 2 }, recordedBy: { id: ID, name: 'Mohamed Bakhoum', partnerNumber: 1 }, recordedAt: null, period: null, countedInBalance: true,
    signedAmount: -100, updatedAt: null, origin: { collection: 'withdrawals', id: ID }, details: { reason: null }, email: 'x@y.z', passwordHash: 'secret', internal: 1,
  }

  it('liste : seuls les champs publics ; détail : + champs propres à l’opération', () => {
    expect('signedAmount' in toOperationView(movement)).toBe(false)
    expect(Object.keys(toOperationDetail(movement))).toContain('details')
    for (const view of [toOperationView(movement), toOperationDetail(movement)]) {
      expect(['email', 'passwordHash', 'internal'].some((key) => key in view)).toBe(false)
    }
  })
})
