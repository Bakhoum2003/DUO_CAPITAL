// Services d'authentification et de session contre une base MongoDB de test (jamais Atlas), avec une horloge injectée.

import { describe, expect, it } from 'vitest'
import { AuditLog } from '../../src/models/AuditLog.js'
import { Session } from '../../src/models/Session.js'
import { User } from '../../src/models/User.js'
import { createAuthService } from '../../src/services/auth.service.js'
import { createSessionRecord, logoutSession, rotateSession } from '../../src/services/session.service.js'
import { hashRefreshToken } from '../../src/services/token.service.js'
import { createLogger } from '../../src/utils/logger.js'
import { OTHER_PASSWORD, TEST_PASSWORD, createTestUser, testDatabaseUrl, useTestDatabase } from '../helpers/authFixtures.js'
import { buildTestConfig } from '../helpers/testConfig.js'

const { auth } = buildTestConfig()
const logger = createLogger({ level: 'silent', environment: 'test' })
const DAY_MS = 24 * 3600 * 1000

describe.skipIf(!testDatabaseUrl())('services d’authentification (base de test)', () => {
  useTestDatabase()

  describe('createSessionRecord', () => {
    it('ne stocke que le hash SHA-256 du refresh token et tronque les informations techniques', async () => {
      const { user } = await createTestUser()
      const { session, refreshToken } = await createSessionRecord({
        userId: user._id,
        ttlSeconds: auth.refreshTokenTtlSeconds,
        meta: { userAgent: 'x'.repeat(500), ipAddress: '203.0.113.7' },
      })
      const stored = await Session.findById(session._id).select('+refreshTokenHash').lean()
      expect(stored.refreshTokenHash).toBe(hashRefreshToken(refreshToken))
      expect(JSON.stringify(stored)).not.toContain(refreshToken)
      expect(stored.userAgent).toHaveLength(300)
      expect(stored.ipAddress).toBe('203.0.113.7')
      expect(stored.familyId).toMatch(/^[A-Za-z0-9-]{16,64}$/)
    })

    it('calcule l’expiration à partir de la durée configurée', async () => {
      const { user } = await createTestUser()
      const now = new Date()
      const { session } = await createSessionRecord({ userId: user._id, ttlSeconds: 7 * 24 * 3600, now })
      expect(session.expiresAt.getTime()).toBe(now.getTime() + 7 * DAY_MS)
    })
  })

  describe('rotateSession', () => {
    it('refuse une session expirée (horloge avancée de 8 jours)', async () => {
      const { user } = await createTestUser()
      const { refreshToken } = await createSessionRecord({ userId: user._id, ttlSeconds: auth.refreshTokenTtlSeconds })
      await expect(rotateSession({ refreshToken, ttlSeconds: auth.refreshTokenTtlSeconds, now: new Date(Date.now() + 8 * DAY_MS) })).rejects.toMatchObject({
        status: 401,
        code: 'SESSION_EXPIRED',
      })
    })

    it('deux renouvellements simultanés avec le même refresh token : un seul réussit, la famille est ensuite révoquée', async () => {
      const { user } = await createTestUser()
      const { refreshToken } = await createSessionRecord({ userId: user._id, ttlSeconds: auth.refreshTokenTtlSeconds })
      const attempts = await Promise.allSettled([
        rotateSession({ refreshToken, ttlSeconds: auth.refreshTokenTtlSeconds }),
        rotateSession({ refreshToken, ttlSeconds: auth.refreshTokenTtlSeconds }),
      ])
      expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1)
      expect(attempts.filter((attempt) => attempt.status === 'rejected')[0].reason).toMatchObject({ code: 'SESSION_REVOKED' })

      const sessions = await Session.find({ user: user._id }).lean()
      expect(sessions).toHaveLength(2) // pas de session fantôme créée par le perdant
      expect(sessions.every((session) => session.revokedAt)).toBe(true)
    })

    it('un refresh token de session déconnectée est refusé, sans nouvelle session ni alerte de fuite', async () => {
      const { user } = await createTestUser()
      const { session, refreshToken } = await createSessionRecord({ userId: user._id, ttlSeconds: auth.refreshTokenTtlSeconds })
      await Session.collection.updateOne({ _id: session._id }, { $set: { revokedAt: new Date(), revokedReason: 'LOGOUT' } })
      await expect(rotateSession({ refreshToken, ttlSeconds: auth.refreshTokenTtlSeconds })).rejects.toMatchObject({ code: 'SESSION_REVOKED' })
      expect(await Session.countDocuments({ user: user._id })).toBe(1)
      expect(await AuditLog.countDocuments({ action: 'SESSION_REUSE_DETECTED' })).toBe(0) // un jeton déconnecté n'est pas une fuite
    })
  })

  describe('logoutSession', () => {
    it('révoque une fois, puis ne fait plus rien', async () => {
      const { user } = await createTestUser()
      const { refreshToken } = await createSessionRecord({ userId: user._id, ttlSeconds: auth.refreshTokenTtlSeconds })
      expect(await logoutSession({ refreshToken })).toBe(true)
      expect(await logoutSession({ refreshToken })).toBe(false)
      expect(await logoutSession({ refreshToken: undefined })).toBe(false)
    })
  })

  describe('login avec horloge injectée', () => {
    it('le verrouillage prend fin à l’échéance de lockDurationMs', async () => {
      const { user } = await createTestUser()
      let current = new Date()
      const service = createAuthService({ config: { auth }, logger, clock: () => current })

      for (let attempt = 0; attempt < auth.maxFailedLogins; attempt += 1) {
        await expect(service.login({ email: user.email, password: OTHER_PASSWORD })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
      }
      await expect(service.login({ email: user.email, password: TEST_PASSWORD })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })

      current = new Date(current.getTime() + auth.lockDurationMs + 1000)
      const result = await service.login({ email: user.email, password: TEST_PASSWORD })
      expect(result.user.email).toBe('mohamed@example.com')
      expect(result.accessToken).toBeTruthy()
      expect((await User.findById(user._id)).lockedUntil).toBeNull()
    })

    it('ne journalise aucun secret dans l’audit', async () => {
      const { user } = await createTestUser()
      const service = createAuthService({ config: { auth }, logger })
      await service.login({ email: user.email, password: TEST_PASSWORD })
      await expect(service.login({ email: user.email, password: OTHER_PASSWORD })).rejects.toThrow()
      const entries = JSON.stringify(await AuditLog.find().lean())
      for (const forbidden of ['$argon2', TEST_PASSWORD, OTHER_PASSWORD, 'refreshToken']) expect(entries).not.toContain(forbidden)
    })
  })
})
