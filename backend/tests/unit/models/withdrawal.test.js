import { describe, expect, it } from 'vitest'
import { Withdrawal } from '../../../src/models/Withdrawal.js'
import { indexByName, invalidPaths, oid } from '../../helpers/modelFixtures.js'

const valid = (overrides = {}) => ({
  beneficiary: oid(),
  amount: 50000,
  withdrawalDate: '2026-11-10',
  recordedBy: oid(),
  ...overrides,
})

describe('modèle Withdrawal', () => {
  it('accepte un retrait valide, motif facultatif', async () => {
    const doc = new Withdrawal(valid())
    expect(await invalidPaths(doc)).toEqual([])
    expect(doc.reason).toBeNull()
    expect(await invalidPaths(new Withdrawal(valid({ reason: 'Besoin personnel' })))).toEqual([])
  })

  it('refuse les champs obligatoires manquants', async () => {
    expect((await invalidPaths(new Withdrawal({}))).sort()).toEqual(['amount', 'beneficiary', 'recordedBy', 'withdrawalDate'])
  })

  it.each([0, -1, 10.5, NaN])('refuse le montant %s', async (amount) => {
    expect(await invalidPaths(new Withdrawal(valid({ amount })))).toContain('amount')
  })

  it('refuse une date invalide et un motif trop long', async () => {
    expect(await invalidPaths(new Withdrawal(valid({ withdrawalDate: '2026-02-31' })))).toContain('withdrawalDate')
    expect(await invalidPaths(new Withdrawal(valid({ reason: 'x'.repeat(301) })))).toContain('reason')
  })

  it('distingue le bénéficiaire de l’auteur', async () => {
    const doc = new Withdrawal(valid())
    expect(String(doc.beneficiary)).not.toBe(String(doc.recordedBy))
  })

  it('suppression logique cohérente et suppression physique interdite', async () => {
    expect(await invalidPaths(new Withdrawal(valid({ deletedAt: new Date() })))).toContain('deletedBy')
    await expect(Withdrawal.deleteOne({}).exec()).rejects.toMatchObject({ code: 'PHYSICAL_DELETE_FORBIDDEN' })
    await expect(new Withdrawal(valid()).deleteOne()).rejects.toMatchObject({ code: 'PHYSICAL_DELETE_FORBIDDEN' })
  })

  it('ne porte aucune règle de trésorerie (imposée par le service) et déclare ses index', async () => {
    expect(Withdrawal.schema.path('treasuryBalance')).toBeUndefined()
    expect(indexByName(Withdrawal, 'withdrawal_beneficiary_date')).toBeTruthy()
  })
})
