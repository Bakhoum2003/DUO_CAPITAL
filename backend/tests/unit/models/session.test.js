import { describe, expect, it } from 'vitest'
import { Session } from '../../../src/models/Session.js'
import { FAKE_SHA256, daysFromNow, indexByName, invalidPaths, oid } from '../../helpers/modelFixtures.js'

const valid = (overrides = {}) => ({
  user: oid(),
  familyId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  refreshTokenHash: FAKE_SHA256,
  expiresAt: daysFromNow(7),
  ...overrides,
})

describe('modèle Session', () => {
  it('accepte une session valide', async () => {
    const session = new Session(valid())
    expect(await invalidPaths(session)).toEqual([])
    expect(session.revokedAt).toBeNull()
  })

  it('refuse les champs obligatoires manquants', async () => {
    expect((await invalidPaths(new Session({}))).sort()).toEqual(['expiresAt', 'familyId', 'refreshTokenHash', 'user'])
  })

  it('refuse un refresh token en clair (seule une empreinte SHA-256 est acceptée)', async () => {
    expect(await invalidPaths(new Session(valid({ refreshTokenHash: 'eyJhbGciOiJIUzI1NiJ9.payload.signature' })))).toContain('refreshTokenHash')
  })

  it('refuse une expiration dans le passé à la création', async () => {
    expect(await invalidPaths(new Session(valid({ expiresAt: daysFromNow(-1) })))).toContain('expiresAt')
  })

  it('exige une date ET un motif pour une révocation', async () => {
    expect(await invalidPaths(new Session(valid({ revokedAt: new Date() })))).toContain('revokedReason')
    expect(await invalidPaths(new Session(valid({ revokedReason: 'LOGOUT' })))).toContain('revokedReason')
    expect(await invalidPaths(new Session(valid({ revokedAt: new Date(), revokedReason: 'LOGOUT' })))).toEqual([])
    expect(await invalidPaths(new Session(valid({ revokedAt: new Date(), revokedReason: 'AUTRE' })))).toContain('revokedReason')
  })

  it('ne sérialise jamais l’empreinte du token', async () => {
    expect(new Session(valid()).toJSON().refreshTokenHash).toBeUndefined()
    expect(Session.schema.path('refreshTokenHash').options.select).toBe(false)
  })

  it('déclare l’unicité de l’empreinte et l’expiration automatique (TTL)', async () => {
    expect(indexByName(Session, 'uniq_session_refresh_token_hash').options.unique).toBe(true)
    const ttl = indexByName(Session, 'ttl_session_expires_at')
    expect(ttl.fields).toEqual({ expiresAt: 1 })
    expect(ttl.options.expireAfterSeconds).toBe(7 * 24 * 60 * 60)
    expect(indexByName(Session, 'session_user_active')).toBeTruthy()
  })
})
