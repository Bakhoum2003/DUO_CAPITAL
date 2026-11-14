import { describe, expect, it } from 'vitest'
import { Contribution } from '../../../src/models/Contribution.js'
import { indexByName, invalidPaths, oid } from '../../helpers/modelFixtures.js'

const valid = (overrides = {}) => ({
  partner: oid(),
  amount: 15000,
  contributionDate: '2026-11-05',
  period: '2026-11',
  recordedBy: oid(),
  ...overrides,
})

describe('modèle Contribution', () => {
  it('accepte une cotisation valide', async () => {
    expect(await invalidPaths(new Contribution(valid()))).toEqual([])
  })

  it('refuse les champs obligatoires manquants', async () => {
    expect((await invalidPaths(new Contribution({}))).sort()).toEqual(['amount', 'contributionDate', 'partner', 'period', 'recordedBy'])
  })

  it.each([0, -5000, 1500.5, NaN, Infinity, '15 000'])('refuse le montant %s', async (amount) => {
    expect(await invalidPaths(new Contribution(valid({ amount })))).toContain('amount')
  })

  it('n’impose aucun plafond individuel', async () => {
    expect(await invalidPaths(new Contribution(valid({ amount: 5_000_000_000 })))).toEqual([])
  })

  it('refuse une date ou une période impossible', async () => {
    expect(await invalidPaths(new Contribution(valid({ contributionDate: '2026-02-30' })))).toContain('contributionDate')
    expect(await invalidPaths(new Contribution(valid({ contributionDate: '05/11/2026' })))).toContain('contributionDate')
    expect(await invalidPaths(new Contribution(valid({ period: '2026-13' })))).toContain('period')
  })

  it('autorise une période différente de la date (paiement en retard) et un auteur différent de l’associé', async () => {
    const doc = new Contribution(valid({ contributionDate: '2026-12-02', period: '2026-11' }))
    expect(await invalidPaths(doc)).toEqual([])
    expect(String(doc.partner)).not.toBe(String(doc.recordedBy))
  })

  it('autorise plusieurs cotisations du même associé le même mois (aucun index unique partner+period)', async () => {
    const partner = oid()
    expect(await invalidPaths(new Contribution(valid({ partner })))).toEqual([])
    expect(await invalidPaths(new Contribution(valid({ partner })))).toEqual([])
    const unique = Contribution.schema.indexes().filter(([, options]) => options?.unique)
    expect(unique).toHaveLength(0)
    expect(indexByName(Contribution, 'contribution_partner_period')).toBeTruthy()
  })

  it('refuse une suppression logique incomplète (date sans auteur)', async () => {
    expect(await invalidPaths(new Contribution(valid({ deletedAt: new Date() })))).toContain('deletedBy')
    expect(await invalidPaths(new Contribution(valid({ deletedAt: new Date(), deletedBy: oid() })))).toEqual([])
  })

  it('fournit markDeleted() et isDeleted', async () => {
    const doc = new Contribution(valid())
    expect(doc.isDeleted).toBe(false)
    doc.markDeleted({ by: oid(), reason: 'Erreur de saisie' })
    expect(doc.isDeleted).toBe(true)
    expect(await invalidPaths(doc)).toEqual([])
  })

  it('interdit la suppression physique (requêtes et document)', async () => {
    await expect(Contribution.deleteOne({}).exec()).rejects.toMatchObject({ code: 'PHYSICAL_DELETE_FORBIDDEN' })
    await expect(Contribution.deleteMany({}).exec()).rejects.toMatchObject({ code: 'PHYSICAL_DELETE_FORBIDDEN' })
    await expect(Contribution.findOneAndDelete({}).exec()).rejects.toMatchObject({ code: 'PHYSICAL_DELETE_FORBIDDEN' })
    await expect(new Contribution(valid()).deleteOne()).rejects.toMatchObject({ code: 'PHYSICAL_DELETE_FORBIDDEN' })
  })

  it('refuse un champ inconnu', async () => {
    expect(() => new Contribution(valid({ currency: 'EUR' }))).toThrow()
  })
})
