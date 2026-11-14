import { describe, expect, it } from 'vitest'
import { Business } from '../../../src/models/Business.js'
import { indexByName, invalidPaths, oid } from '../../helpers/modelFixtures.js'

const valid = (overrides = {}) => ({
  name: 'Élevage de poulets',
  startDate: '2026-03-01',
  createdBy: oid(),
  ...overrides,
})

describe('modèle Business', () => {
  it('accepte une activité valide avec les valeurs par défaut', async () => {
    const doc = new Business(valid())
    expect(await invalidPaths(doc)).toEqual([])
    expect(doc.status).toBe('ACTIVE')
    expect(doc.endDate).toBeNull()
    expect(doc.reopenHistory).toHaveLength(0)
  })

  it('calcule nameKey (sans accents ni casse) lors de la validation', async () => {
    const doc = new Business(valid({ name: '  Élevage   de Poulets ' }))
    await doc.validate()
    expect(doc.nameKey).toBe('elevage de poulets')
  })

  it('refuse les champs obligatoires manquants', async () => {
    expect((await invalidPaths(new Business({}))).sort()).toEqual(['createdBy', 'name', 'startDate'])
  })

  it('accepte ACTIVE, SUSPENDED, COMPLETED, ARCHIVED et refuse les autres statuts', async () => {
    expect(await invalidPaths(new Business(valid({ status: 'ARCHIVED' })))).toEqual([])
    expect(await invalidPaths(new Business(valid({ status: 'SUSPENDED' })))).toEqual([])
    expect(await invalidPaths(new Business(valid({ status: 'COMPLETED', endDate: '2026-06-30' })))).toEqual([])
    expect(await invalidPaths(new Business(valid({ status: 'CLOSED' })))).toContain('status')
  })

  it('exige une date de fin pour une activité terminée', async () => {
    expect(await invalidPaths(new Business(valid({ status: 'COMPLETED' })))).toContain('endDate')
  })

  it('refuse une date de fin antérieure à la date de début', async () => {
    expect(await invalidPaths(new Business(valid({ endDate: '2026-02-28' })))).toContain('endDate')
    expect(await invalidPaths(new Business(valid({ endDate: '2026-03-01' })))).toEqual([])
  })

  it('refuse des dates impossibles', async () => {
    expect(await invalidPaths(new Business(valid({ startDate: '2026-02-30' })))).toContain('startDate')
    expect(await invalidPaths(new Business(valid({ endDate: '2026-13-01' })))).toContain('endDate')
  })

  it('enregistre la traçabilité d’une réouverture (motif obligatoire)', async () => {
    const entry = { reopenedAt: new Date(), reopenedBy: oid(), reason: 'Nouvelle campagne', previousEndDate: '2026-06-30' }
    expect(await invalidPaths(new Business(valid({ reopenHistory: [entry] })))).toEqual([])
    const withoutReason = await invalidPaths(new Business(valid({ reopenHistory: [{ ...entry, reason: '' }] })))
    expect(withoutReason).toContain('reopenHistory.0.reason')
  })

  it('ne porte aucun solde ni investissement initial (l’investissement est une opération)', async () => {
    for (const path of ['initialInvestment', 'cashBalance', 'profit', 'balance']) expect(Business.schema.path(path)).toBeUndefined()
  })

  it('interdit toute suppression physique : on archive', async () => {
    await expect(Business.deleteOne({}).exec()).rejects.toMatchObject({ code: 'BUSINESS_DELETE_FORBIDDEN' })
    await expect(Business.deleteMany({}).exec()).rejects.toMatchObject({ code: 'BUSINESS_DELETE_FORBIDDEN' })
    await expect(Business.findOneAndDelete({}).exec()).rejects.toMatchObject({ code: 'BUSINESS_DELETE_FORBIDDEN' })
    await expect(new Business(valid()).deleteOne()).rejects.toMatchObject({ code: 'BUSINESS_DELETE_FORBIDDEN' })
  })

  it('déclare ses index et la concurrence optimiste', async () => {
    expect(indexByName(Business, 'business_status_start')).toBeTruthy()
    expect(indexByName(Business, 'business_name_key').options.unique).toBeUndefined()
    expect(Business.schema.options.optimisticConcurrency).toBe(true)
  })
})
