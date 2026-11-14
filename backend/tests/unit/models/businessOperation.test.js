import { describe, expect, it } from 'vitest'
import { BusinessOperation } from '../../../src/models/BusinessOperation.js'
import { indexByName, invalidPaths, oid } from '../../helpers/modelFixtures.js'

const valid = (overrides = {}) => ({
  business: oid(),
  type: 'EXPENSE',
  amount: 25000,
  operationDate: '2026-11-08',
  recordedBy: oid(),
  ...overrides,
})

describe('modèle BusinessOperation', () => {
  it('accepte une opération valide pour chacun des trois types', async () => {
    for (const type of ['INVESTMENT', 'EXPENSE', 'REVENUE']) {
      expect(await invalidPaths(new BusinessOperation(valid({ type })))).toEqual([])
    }
  })

  it('refuse les champs obligatoires manquants', async () => {
    expect((await invalidPaths(new BusinessOperation({}))).sort()).toEqual(['amount', 'business', 'operationDate', 'recordedBy', 'type'])
  })

  it('refuse un type qui n’est pas un mouvement d’argent (aucun calcul enregistré comme opération)', async () => {
    for (const type of ['PROFIT', 'BALANCE', 'RESULT', 'expense']) {
      expect(await invalidPaths(new BusinessOperation(valid({ type })))).toContain('type')
    }
  })

  it.each([0, -1, 2500.75, NaN, Infinity])('refuse le montant %s', async (amount) => {
    expect(await invalidPaths(new BusinessOperation(valid({ amount })))).toContain('amount')
  })

  it('refuse une date métier invalide', async () => {
    expect(await invalidPaths(new BusinessOperation(valid({ operationDate: '2026-04-31' })))).toContain('operationDate')
  })

  it('distingue l’auteur de l’associé concerné (facultatif)', async () => {
    const doc = new BusinessOperation(valid({ concernedPartner: oid() }))
    expect(await invalidPaths(doc)).toEqual([])
    expect(String(doc.concernedPartner)).not.toBe(String(doc.recordedBy))
    expect(new BusinessOperation(valid()).concernedPartner).toBeNull()
  })

  it('valide le justificatif éventuel', async () => {
    expect(await invalidPaths(new BusinessOperation(valid({ receipt: { reference: 'REC-001', url: 'https://example.com/recu.pdf' } })))).toEqual([])
    expect(await invalidPaths(new BusinessOperation(valid({ receipt: { url: 'javascript:alert(1)' } })))).toContain('receipt.url')
    expect(new BusinessOperation(valid()).receipt).toBeNull()
  })

  it('limite la description', async () => {
    expect(await invalidPaths(new BusinessOperation(valid({ description: 'x'.repeat(501) })))).toContain('description')
  })

  it('suppression logique cohérente et suppression physique interdite', async () => {
    expect(await invalidPaths(new BusinessOperation(valid({ deletedBy: oid() })))).toContain('deletedBy')
    expect(await invalidPaths(new BusinessOperation(valid({ deletedAt: new Date(), deletedBy: oid(), deletionReason: 'Doublon' })))).toEqual([])
    await expect(BusinessOperation.deleteOne({}).exec()).rejects.toMatchObject({ code: 'PHYSICAL_DELETE_FORBIDDEN' })
    await expect(BusinessOperation.deleteMany({}).exec()).rejects.toMatchObject({ code: 'PHYSICAL_DELETE_FORBIDDEN' })
    await expect(new BusinessOperation(valid()).deleteOne()).rejects.toMatchObject({ code: 'PHYSICAL_DELETE_FORBIDDEN' })
  })

  it('verrouille l’activité, le type et l’auteur après création (immuables)', async () => {
    for (const path of ['business', 'type', 'recordedBy']) expect(BusinessOperation.schema.path(path).options.immutable).toBe(true)
  })

  it('ne vérifie PAS l’état de l’activité : règle réservée aux services (activité terminée)', async () => {
    // Le schéma ne peut pas lire Business ; le service refusera l'ajout sur une activité COMPLETED.
    expect(BusinessOperation.schema.path('businessStatus')).toBeUndefined()
  })

  it('déclare ses index', async () => {
    for (const name of ['operation_business_date', 'operation_business_type', 'operation_partner_date']) {
      expect(indexByName(BusinessOperation, name)).toBeTruthy()
    }
  })
})
