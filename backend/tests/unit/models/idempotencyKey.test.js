import { describe, expect, it } from 'vitest'
import { IdempotencyKey } from '../../../src/models/IdempotencyKey.js'
import { FAKE_SHA256, indexByName, invalidPaths, oid } from '../../helpers/modelFixtures.js'

const valid = (overrides = {}) => ({
  key: '3f2b8c1e-9d4a-4e6b-8a1f-0c2d3e4f5a6b',
  actor: oid(),
  endpoint: 'POST /api/v1/contributions',
  requestHash: FAKE_SHA256,
  ...overrides,
})

describe('modèle IdempotencyKey', () => {
  it('accepte une clé valide : état PROCESSING et expiration à +24 h par défaut', async () => {
    const doc = new IdempotencyKey(valid())
    expect(await invalidPaths(doc)).toEqual([])
    expect(doc.status).toBe('PROCESSING')
    const delta = doc.expiresAt.getTime() - Date.now()
    expect(delta > 23 * 3600 * 1000 && delta <= 24 * 3600 * 1000).toBe(true)
  })

  it('refuse les champs obligatoires manquants', async () => {
    expect((await invalidPaths(new IdempotencyKey({}))).sort()).toEqual(['actor', 'endpoint', 'key', 'requestHash'])
  })

  it('refuse une clé trop courte, trop longue ou aux caractères interdits', async () => {
    for (const key of ['abc', 'x'.repeat(129), 'clé avec espaces !']) {
      expect(await invalidPaths(new IdempotencyKey(valid({ key })))).toContain('key')
    }
  })

  it('refuse une empreinte de requête qui n’est pas un SHA-256 et un endpoint mal formé', async () => {
    expect(await invalidPaths(new IdempotencyKey(valid({ requestHash: 'abc' })))).toContain('requestHash')
    expect(await invalidPaths(new IdempotencyKey(valid({ endpoint: '/api/v1/contributions' })))).toContain('endpoint')
  })

  it('refuse un état inconnu', async () => {
    expect(await invalidPaths(new IdempotencyKey(valid({ status: 'DONE' })))).toContain('status')
  })

  it('exige la réponse enregistrée et la date de fin pour COMPLETED', async () => {
    expect((await invalidPaths(new IdempotencyKey(valid({ status: 'COMPLETED' })))).sort()).toEqual(['completedAt', 'response'])
    const done = valid({ status: 'COMPLETED', completedAt: new Date(), response: { statusCode: 201, body: { data: { id: 'x' } } } })
    expect(await invalidPaths(new IdempotencyKey(done))).toEqual([])
  })

  it('refuse un code HTTP invalide et une réponse trop volumineuse', async () => {
    const base = { status: 'COMPLETED', completedAt: new Date() }
    expect(await invalidPaths(new IdempotencyKey(valid({ ...base, response: { statusCode: 99 } })))).toContain('response.statusCode')
    expect(await invalidPaths(new IdempotencyKey(valid({ ...base, response: { statusCode: 200, body: { big: 'x'.repeat(65 * 1024) } } })))).toContain('response.body')
  })

  it('protège contre les doublons : index unique (acteur, clé) + expiration automatique', async () => {
    const unique = indexByName(IdempotencyKey, 'uniq_idempotency_actor_key')
    expect(unique.fields).toEqual({ actor: 1, key: 1 })
    expect(unique.options.unique).toBe(true)
    expect(indexByName(IdempotencyKey, 'ttl_idempotency_expires_at').options.expireAfterSeconds).toBe(0)
  })

  it('verrouille clé, acteur, endpoint et empreinte après création', async () => {
    for (const path of ['key', 'actor', 'endpoint', 'requestHash']) expect(IdempotencyKey.schema.path(path).options.immutable).toBe(true)
  })
})
