
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { AuditLog } from '../../src/models/AuditLog.js'
import { Session } from '../../src/models/Session.js'
import { User } from '../../src/models/User.js'
import { hashRefreshToken, signAccessToken } from '../../src/services/token.service.js'
import { createLogger } from '../../src/utils/logger.js'
import {
  OTHER_PASSWORD,
  TEST_PASSWORD,
  cookieHeader,
  createTestUser,
  readSetCookie,
  setCookieLines,
  testDatabaseUrl,
  useTestDatabase,
} from '../helpers/authFixtures.js'
import { FRONTEND_ORIGIN, buildTestConfig, withAuth } from '../helpers/testConfig.js'

const logger = createLogger({ level: 'silent', environment: 'test' })
const baseConfig = withAuth(buildTestConfig(), { loginRateLimit: { windowMs: 60_000, max: 1000 } })

describe.skipIf(!testDatabaseUrl())('API /api/auth (base de test)', () => {
  const { database } = useTestDatabase()
  const makeApp = (config = baseConfig) => createApp({ config, logger, database })
  let app

  beforeAll(() => {
    app = makeApp()
  })

  const postLogin = (body, target = app) => request(target).post('/api/auth/login').send(body)

  async function loginAs({ user, password = TEST_PASSWORD }, target = app) {
    const res = await postLogin({ email: user.email, password }, target)
    expect(res.status).toBe(200)
    return { res, access: readSetCookie(res, 'dc_access').value, refresh: readSetCookie(res, 'dc_refresh').value }
  }

  const authCookies = ({ access, refresh }) => cookieHeader({ dc_access: access, dc_refresh: refresh })
  const refreshWith = (refresh, target = app) => request(target).post('/api/auth/refresh').set('Cookie', cookieHeader({ dc_refresh: refresh }))
  const meWith = (access) => request(app).get('/api/auth/me').set('Cookie', cookieHeader({ dc_access: access }))

  function expectNoSecrets(res, extraSecrets = []) {
    const text = `${res.text}${JSON.stringify(res.body)}`
    for (const forbidden of ['passwordHash', '$argon2', 'refreshTokenHash', TEST_PASSWORD, OTHER_PASSWORD, ...extraSecrets]) {
      expect(text).not.toContain(forbidden)
    }
  }

  describe('isolation', () => {
    it('travaille sur une base de test, jamais sur DATABASE_URL ni sur Atlas', () => {
      expect(process.env.DATABASE_URL).toBeUndefined()
      expect(mongoose.connection.name).toMatch(/test/)
      expect(String(mongoose.connection.host)).not.toContain('mongodb.net')
    })
  })

  describe('POST /api/auth/login', () => {
    it('connecte un associé : réponse publique, cookies HttpOnly, session enregistrée avec le hash SHA-256 seulement', async () => {
      const { user } = await createTestUser()
      const res = await postLogin({ email: user.email, password: TEST_PASSWORD })

      expect(res.status).toBe(200)
      expect(res.headers['cache-control']).toBe('no-store')
      expect(res.body.data.user).toEqual({ id: String(user._id), name: 'Mohamed Bakhoum', email: 'mohamed@example.com', partnerNumber: 1 })
      expect(new Date(res.body.data.accessExpiresAt).getTime()).toBeGreaterThan(Date.now())

      const access = readSetCookie(res, 'dc_access')
      const refresh = readSetCookie(res, 'dc_refresh')
      expect(access.attributes).toMatchObject({ httponly: true, samesite: 'Lax', path: '/api' })
      expect(refresh.attributes).toMatchObject({ httponly: true, samesite: 'Lax', path: '/api/auth' })
      expect(access.attributes.secure).toBeUndefined() // Secure seulement en production
      expect(Number(access.attributes['max-age'])).toBeLessThanOrEqual(15 * 60)
      expect(Number(refresh.attributes['max-age'])).toBeLessThanOrEqual(7 * 24 * 3600)

      expectNoSecrets(res, [access.value, refresh.value])

      const stored = await Session.findOne({ user: user._id }).select('+refreshTokenHash').lean()
      expect(stored.refreshTokenHash).toBe(hashRefreshToken(refresh.value))
      expect(JSON.stringify(stored)).not.toContain(refresh.value)
      expect(stored.revokedAt).toBeNull()
      expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 3600 * 1000)

      const refreshed = await User.findById(user._id)
      expect(refreshed.lastLoginAt).toBeInstanceOf(Date)
      expect(await AuditLog.countDocuments({ action: 'LOGIN_SUCCEEDED', actor: user._id })).toBe(1)
    })

    it('normalise l’email (espaces et majuscules)', async () => {
      await createTestUser()
      const res = await postLogin({ email: '  MOHAMED@Example.COM ', password: TEST_PASSWORD })
      expect(res.status).toBe(200)
    })

    it('refuse un email inconnu et un mauvais mot de passe avec EXACTEMENT la même réponse', async () => {
      const { user } = await createTestUser()
      const unknown = await postLogin({ email: 'inconnu@example.com', password: TEST_PASSWORD })
      const wrong = await postLogin({ email: user.email, password: OTHER_PASSWORD })
      expect(unknown.status).toBe(401)
      expect(wrong.status).toBe(401)
      expect(unknown.body.error.code).toBe('INVALID_CREDENTIALS')
      expect({ ...wrong.body.error, requestId: null }).toEqual({ ...unknown.body.error, requestId: null })
      expect(setCookieLines(unknown)).toHaveLength(0)
      expect(setCookieLines(wrong)).toHaveLength(0)
      expect(await Session.countDocuments()).toBe(0)
    })

    it('refuse un compte désactivé, même avec le bon mot de passe, sans le révéler', async () => {
      const { user } = await createTestUser({ status: 'DISABLED' })
      const res = await postLogin({ email: user.email, password: TEST_PASSWORD })
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
      expect(await Session.countDocuments()).toBe(0)
    })

    it('verrouille le compte après 5 échecs, y compris pour le bon mot de passe, puis le rouvre à l’échéance', async () => {
      const { user } = await createTestUser()
      for (let attempt = 0; attempt < 5; attempt += 1) {
        expect((await postLogin({ email: user.email, password: OTHER_PASSWORD })).status).toBe(401)
      }
      const locked = await User.findById(user._id)
      expect(locked.lockedUntil.getTime()).toBeGreaterThan(Date.now())
      expect(await AuditLog.countDocuments({ action: 'ACCOUNT_LOCKED', actor: user._id })).toBe(1)

      const duringLock = await postLogin({ email: user.email, password: TEST_PASSWORD })
      expect(duringLock.status).toBe(401)
      expect(duringLock.body.error.code).toBe('INVALID_CREDENTIALS')

      await User.updateOne({ _id: user._id }, { $set: { lockedUntil: new Date(Date.now() - 1000) } })
      expect((await postLogin({ email: user.email, password: TEST_PASSWORD })).status).toBe(200)
      expect((await User.findById(user._id)).failedLoginAttempts).toBe(0)
    })

    it('un succès remet à zéro le compteur d’échecs', async () => {
      const { user } = await createTestUser()
      await postLogin({ email: user.email, password: OTHER_PASSWORD })
      expect((await User.findById(user._id)).failedLoginAttempts).toBe(1)
      await postLogin({ email: user.email, password: TEST_PASSWORD })
      expect((await User.findById(user._id)).failedLoginAttempts).toBe(0)
    })

    it('limite les tentatives par adresse IP (429) sans bloquer les succès', async () => {
      const { user } = await createTestUser()
      const limited = makeApp(withAuth(baseConfig, { loginRateLimit: { windowMs: 60_000, max: 3 } }))
      for (let attempt = 0; attempt < 3; attempt += 1) {
        expect((await postLogin({ email: 'inconnu@example.com', password: 'x' }, limited)).status).toBe(401)
      }
      const blocked = await postLogin({ email: user.email, password: TEST_PASSWORD }, limited)
      expect(blocked.status).toBe(429)
      expect(blocked.body.error.code).toBe('TOO_MANY_LOGIN_ATTEMPTS')
    })

    it('refuse un corps invalide (400) : champs manquants, inconnus ou injection d’objet', async () => {
      await createTestUser()
      for (const body of [{}, { email: 'mohamed@example.com' }, { email: 'mohamed@example.com', password: TEST_PASSWORD, role: 'ADMIN' }, { email: { $ne: null }, password: { $ne: null } }]) {
        const res = await postLogin(body)
        expect(res.status).toBe(400)
        expect(res.body.error.code).toBe('VALIDATION_ERROR')
      }
    })

    it('pose des cookies Secure avec SameSite=None quand la configuration le demande (production)', async () => {
      const { user } = await createTestUser()
      const productionLike = makeApp({ ...baseConfig, cookies: { secure: true, sameSite: 'none' } })
      const { res } = await loginAs({ user }, productionLike)
      for (const name of ['dc_access', 'dc_refresh']) {
        expect(readSetCookie(res, name).attributes).toMatchObject({ secure: true, httponly: true, samesite: 'None' })
      }
    })
  })

  describe('origines et inscription', () => {
    it('refuse (403) une requête modifiante venant d’une origine non autorisée, autorise le frontend', async () => {
      const { user } = await createTestUser()
      const evil = await postLogin({ email: user.email, password: TEST_PASSWORD }).set('Origin', 'https://pirate.example.com')
      expect(evil.status).toBe(403)
      expect(evil.body.error.code).toBe('FORBIDDEN_ORIGIN')
      expect(setCookieLines(evil)).toHaveLength(0)

      const good = await postLogin({ email: user.email, password: TEST_PASSWORD }).set('Origin', FRONTEND_ORIGIN)
      expect(good.status).toBe(200)
      expect(good.headers['access-control-allow-credentials']).toBe('true')
    })

    it.each(['/api/auth/register', '/api/auth/signup', '/api/v1/auth/register', '/api/register', '/api/users'])('aucune route d’inscription : POST %s -> 404', async (path) => {
      const res = await request(app).post(path).send({ email: 'x@example.com', password: TEST_PASSWORD, name: 'X' })
      expect(res.status).toBe(404)
      expect(await User.countDocuments()).toBe(0)
    })
  })

  describe('GET /api/auth/me', () => {
    it('retourne uniquement les informations publiques de l’utilisateur connecté', async () => {
      const { user } = await createTestUser({ partnerNumber: 2, name: 'Cheikh Sow', email: 'cheikh@example.com' })
      const session = await loginAs({ user })
      const res = await meWith(session.access)
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ data: { user: { id: String(user._id), name: 'Cheikh Sow', email: 'cheikh@example.com', partnerNumber: 2 } } })
      expectNoSecrets(res, [session.access, session.refresh])
    })

    it('refuse sans authentification (401 UNAUTHENTICATED)', async () => {
      const res = await request(app).get('/api/auth/me')
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('UNAUTHENTICATED')
    })

    it('ignore un jeton envoyé dans l’en-tête Authorization (cookies HttpOnly uniquement)', async () => {
      const { user } = await createTestUser()
      const session = await loginAs({ user })
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${session.access}`)
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('UNAUTHENTICATED')
    })

    it('refuse un jeton invalide, falsifié, signé avec un autre secret ou sans signature (INVALID_TOKEN)', async () => {
      const { user } = await createTestUser()
      const { access } = await loginAs({ user })
      const forged = `${access.slice(0, -3)}abc`
      const otherSecret = jwt.sign({ sub: String(user._id), sid: 'a'.repeat(24), typ: 'access' }, 'un-autre-secret-de-test-0123456789abcdef', { expiresIn: 600 })
      const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
      const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: String(user._id), sid: 'a'.repeat(24), typ: 'access' })}.`

      for (const token of ['pas-un-jeton', forged, otherSecret, none]) {
        const res = await meWith(token)
        expect(res.status).toBe(401)
        expect(res.body.error.code).toBe('INVALID_TOKEN')
      }
    })

    it('refuse un jeton expiré (TOKEN_EXPIRED)', async () => {
      const { user } = await createTestUser()
      const { token } = signAccessToken({ userId: user._id, sessionId: new mongoose.Types.ObjectId() }, baseConfig.auth, new Date(Date.now() - 60 * 60 * 1000))
      const res = await meWith(token)
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('TOKEN_EXPIRED')
    })

    it('refuse un jeton valide dont la session n’existe pas (SESSION_REVOKED)', async () => {
      const { user } = await createTestUser()
      const { token } = signAccessToken({ userId: user._id, sessionId: new mongoose.Types.ObjectId() }, baseConfig.auth)
      const res = await meWith(token)
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('SESSION_REVOKED')
    })

    it('refuse une session révoquée, expirée, ou appartenant à un autre utilisateur', async () => {
      const { user } = await createTestUser()
      const other = (await createTestUser({ partnerNumber: 2, name: 'Cheikh Sow', email: 'cheikh@example.com' })).user
      const mine = await loginAs({ user })
      const sessionId = (await Session.findOne({ user: user._id }))._id

      const foreign = signAccessToken({ userId: other._id, sessionId }, baseConfig.auth).token
      expect((await meWith(foreign)).body.error.code).toBe('SESSION_REVOKED')

      await Session.collection.updateOne({ _id: sessionId }, { $set: { expiresAt: new Date(Date.now() - 1000) } })
      expect((await meWith(mine.access)).body.error.code).toBe('SESSION_EXPIRED')

      await Session.collection.updateOne({ _id: sessionId }, { $set: { expiresAt: new Date(Date.now() + 3600_000), revokedAt: new Date(), revokedReason: 'MANUAL' } })
      expect((await meWith(mine.access)).body.error.code).toBe('SESSION_REVOKED')
    })

    it('refuse dès que le compte est désactivé', async () => {
      const { user } = await createTestUser()
      const session = await loginAs({ user })
      await User.updateOne({ _id: user._id }, { $set: { status: 'DISABLED' } })
      const res = await meWith(session.access)
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('SESSION_REVOKED')
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('renouvelle la session et tourne le refresh token (même famille, ancienne session révoquée ROTATED)', async () => {
      const { user } = await createTestUser()
      const first = await loginAs({ user })
      const res = await refreshWith(first.refresh)

      expect(res.status).toBe(200)
      expect(res.body.data.user.email).toBe('mohamed@example.com')
      const nextRefresh = readSetCookie(res, 'dc_refresh')
      const nextAccess = readSetCookie(res, 'dc_access')
      expect(nextRefresh.value).not.toBe(first.refresh)
      expect(nextAccess.value).not.toBe(first.access)
      expect(nextRefresh.attributes).toMatchObject({ httponly: true, path: '/api/auth' })
      expectNoSecrets(res, [nextRefresh.value, nextAccess.value, first.refresh])

      const sessions = await Session.find({ user: user._id }).select('+refreshTokenHash').sort({ _id: 1 }).lean()
      expect(sessions).toHaveLength(2)
      expect(sessions[0].revokedReason).toBe('ROTATED')
      expect(String(sessions[0].replacedBy)).toBe(String(sessions[1]._id))
      expect(sessions[1].familyId).toBe(sessions[0].familyId)
      expect(sessions[1].revokedAt).toBeNull()
      expect(sessions[1].refreshTokenHash).toBe(hashRefreshToken(nextRefresh.value))

      expect((await meWith(nextAccess.value)).status).toBe(200)
    })

    it('détecte la réutilisation d’un ancien refresh token et révoque toute la famille', async () => {
      const { user } = await createTestUser()
      const first = await loginAs({ user })
      const second = await refreshWith(first.refresh)
      const latest = readSetCookie(second, 'dc_refresh').value
      const latestAccess = readSetCookie(second, 'dc_access').value

      const replay = await refreshWith(first.refresh)
      expect(replay.status).toBe(401)
      expect(replay.body.error.code).toBe('SESSION_REVOKED')

      const sessions = await Session.find({ user: user._id }).lean()
      expect(sessions.every((session) => session.revokedAt)).toBe(true)
      expect(sessions.filter((session) => session.revokedReason === 'REUSE_DETECTED')).toHaveLength(1)
      expect(await AuditLog.countDocuments({ action: 'SESSION_REUSE_DETECTED', actor: user._id })).toBe(1)

      expect((await refreshWith(latest)).status).toBe(401) // le jeton légitime est lui aussi révoqué
      expect((await meWith(latestAccess)).body.error.code).toBe('SESSION_REVOKED')
    })

    it.each([[undefined], ['n-importe-quoi'], ['a'.repeat(43)]])('refuse un refresh token absent ou invalide (%s) et supprime les cookies', async (token) => {
      const res = token === undefined ? await request(app).post('/api/auth/refresh') : await refreshWith(token)
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN')
      const cleared = setCookieLines(res)
      expect(cleared.some((line) => line.startsWith('dc_access=;') && /Expires=Thu, 01 Jan 1970/.test(line))).toBe(true)
      expect(cleared.some((line) => line.startsWith('dc_refresh=;'))).toBe(true)
    })

    it('refuse une session expirée (SESSION_EXPIRED)', async () => {
      const { user } = await createTestUser()
      const session = await loginAs({ user })
      await Session.collection.updateOne({ user: user._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } })
      const res = await refreshWith(session.refresh)
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('SESSION_EXPIRED')
    })

    it('refuse et révoque la session si le compte a été désactivé depuis', async () => {
      const { user } = await createTestUser()
      const session = await loginAs({ user })
      await User.updateOne({ _id: user._id }, { $set: { status: 'DISABLED' } })
      const res = await refreshWith(session.refresh)
      expect(res.status).toBe(401)
      expect((await Session.findOne({ user: user._id })).revokedReason).toBe('ACCOUNT_DISABLED')
    })

    it('refuse un refresh token dans le corps JSON (cookie uniquement)', async () => {
      const { user } = await createTestUser()
      const session = await loginAs({ user })
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: session.refresh })
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('révoque la session, supprime les cookies et invalide le jeton d’accès', async () => {
      const { user } = await createTestUser()
      const session = await loginAs({ user })
      const res = await request(app).post('/api/auth/logout').set('Cookie', authCookies(session))

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ data: { loggedOut: true } })
      expect(setCookieLines(res).filter((line) => /Expires=Thu, 01 Jan 1970/.test(line))).toHaveLength(2)

      const stored = await Session.findOne({ user: user._id })
      expect(stored.revokedReason).toBe('LOGOUT')
      expect(stored.revokedAt).toBeInstanceOf(Date)
      expect((await meWith(session.access)).body.error.code).toBe('SESSION_REVOKED')
      expect((await refreshWith(session.refresh)).status).toBe(401)
      expect(await AuditLog.countDocuments({ action: 'LOGOUT', actor: user._id })).toBe(1)
    })

    it('est idempotente : session déjà révoquée, jeton inconnu ou absent -> 200, sans nouvelle écriture', async () => {
      const { user } = await createTestUser()
      const session = await loginAs({ user })
      await request(app).post('/api/auth/logout').set('Cookie', authCookies(session))

      const again = await request(app).post('/api/auth/logout').set('Cookie', authCookies(session))
      expect(again.status).toBe(200)
      const unknown = await request(app).post('/api/auth/logout').set('Cookie', cookieHeader({ dc_refresh: 'a'.repeat(43) }))
      expect(unknown.status).toBe(200)
      const none = await request(app).post('/api/auth/logout')
      expect(none.status).toBe(200)

      expect(await AuditLog.countDocuments({ action: 'LOGOUT' })).toBe(1)
    })

    it('ne révoque que la session concernée (l’autre associé reste connecté)', async () => {
      const mohamed = await loginAs(await createTestUser())
      const cheikh = await loginAs(await createTestUser({ partnerNumber: 2, name: 'Cheikh Sow', email: 'cheikh@example.com' }))
      await request(app).post('/api/auth/logout').set('Cookie', authCookies(mohamed))
      expect((await meWith(cheikh.access)).status).toBe(200)
    })
  })

  describe('limite de deux associés', () => {
    it('la base refuse un troisième compte (partnerNumber unique, valeurs 1 et 2)', async () => {
      await createTestUser({ partnerNumber: 1 })
      await createTestUser({ partnerNumber: 2, name: 'Cheikh Sow', email: 'cheikh@example.com' })
      await expect(createTestUser({ partnerNumber: 1, name: 'Intrus', email: 'intrus@example.com' })).rejects.toThrow()
      await expect(createTestUser({ partnerNumber: 3, name: 'Intrus', email: 'intrus2@example.com' })).rejects.toThrow()
      expect(await User.countDocuments()).toBe(2)
    })
  })
})
