import { describe, expect, it } from 'vitest'
import { AuditLog } from '../../../src/models/AuditLog.js'
import { indexByName, invalidPaths, oid } from '../../helpers/modelFixtures.js'

const valid = (overrides = {}) => ({
  actor: oid(),
  action: 'CONTRIBUTION_CREATED',
  resourceType: 'CONTRIBUTION',
  resourceId: oid(),
  ...overrides,
})

describe('modèle AuditLog', () => {
  it('accepte une entrée valide et date l’action en UTC', async () => {
    const doc = new AuditLog(valid({ before: null, after: { amount: 15000 } }))
    expect(await invalidPaths(doc)).toEqual([])
    expect(doc.occurredAt).toBeInstanceOf(Date)
    expect(doc.toJSON().occurredAt).toBeInstanceOf(Date)
  })

  it('refuse les champs obligatoires manquants', async () => {
    expect((await invalidPaths(new AuditLog({ actorType: 'SYSTEM' }))).sort()).toEqual(['action', 'resourceId', 'resourceType'])
    expect((await invalidPaths(new AuditLog({}))).sort()).toEqual(['action', 'actor', 'resourceId', 'resourceType'])
  })

  it('autorise un acteur SYSTEM sans utilisateur', async () => {
    expect(await invalidPaths(new AuditLog(valid({ actor: null, actorType: 'SYSTEM' })))).toEqual([])
  })

  it('refuse une action mal formée et un type de ressource inconnu', async () => {
    expect(await invalidPaths(new AuditLog(valid({ action: 'créé' })))).toContain('action')
    expect(await invalidPaths(new AuditLog(valid({ resourceType: 'UNKNOWN_RESOURCE' })))).toContain('resourceType')
    expect(await invalidPaths(new AuditLog(valid({ resourceType: 'SETTINGS' })))).toEqual([]) // Phase Paramètres : type ajouté, sans retirer aucun type existant
  })

  it('refuse tout secret dans before/after, à tout niveau', async () => {
    expect(await invalidPaths(new AuditLog(valid({ after: { passwordHash: 'x' } })))).toContain('after')
    expect(await invalidPaths(new AuditLog(valid({ before: { user: { refreshToken: 'x' } } })))).toContain('before')
    expect(await invalidPaths(new AuditLog(valid({ after: { headers: { Authorization: 'Bearer x' } } })))).toContain('after')
  })

  it('refuse une charge trop volumineuse', async () => {
    expect(await invalidPaths(new AuditLog(valid({ after: { note: 'x'.repeat(21 * 1024) } })))).toContain('after')
  })

  it('refuse toute modification et toute suppression via Mongoose', async () => {
    await expect(AuditLog.updateOne({}, { $set: { action: 'X' } }).exec()).rejects.toMatchObject({ code: 'IMMUTABLE_RECORD' })
    await expect(AuditLog.updateMany({}, { $set: { action: 'X' } }).exec()).rejects.toMatchObject({ code: 'IMMUTABLE_RECORD' })
    await expect(AuditLog.findOneAndUpdate({}, { $set: { action: 'X' } }).exec()).rejects.toMatchObject({ code: 'IMMUTABLE_RECORD' })
    await expect(AuditLog.replaceOne({}, valid()).exec()).rejects.toMatchObject({ code: 'IMMUTABLE_RECORD' })
    await expect(AuditLog.deleteOne({}).exec()).rejects.toMatchObject({ code: 'IMMUTABLE_RECORD' })
    await expect(AuditLog.deleteMany({}).exec()).rejects.toMatchObject({ code: 'IMMUTABLE_RECORD' })
    await expect(AuditLog.findOneAndDelete({}).exec()).rejects.toMatchObject({ code: 'IMMUTABLE_RECORD' })
    await expect(new AuditLog(valid()).deleteOne()).rejects.toMatchObject({ code: 'IMMUTABLE_RECORD' })
  })

  it('refuse d’enregistrer un document déjà existant (save après création)', async () => {
    const doc = new AuditLog(valid())
    doc.isNew = false // simule un document relu depuis la base
    await expect(doc.save()).rejects.toMatchObject({ code: 'IMMUTABLE_RECORD' })
  })

  it('déclare tous ses champs immuables', async () => {
    for (const path of ['actor', 'action', 'resourceType', 'resourceId', 'occurredAt', 'before', 'after']) {
      expect(AuditLog.schema.path(path).options.immutable).toBe(true)
    }
  })

  it('n’a ni suppression logique ni horodatage de modification', async () => {
    expect(AuditLog.schema.path('deletedAt')).toBeUndefined()
    expect(AuditLog.schema.path('updatedAt')).toBeUndefined()
  })

  it('déclare ses index', async () => {
    for (const name of ['audit_resource', 'audit_actor', 'audit_action', 'audit_recent']) expect(indexByName(AuditLog, name)).toBeTruthy()
  })
})
