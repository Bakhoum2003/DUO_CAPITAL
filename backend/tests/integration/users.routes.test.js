
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { AuditLog } from '../../src/models/AuditLog.js'
import { Contribution } from '../../src/models/Contribution.js'
import { Session } from '../../src/models/Session.js'
import { User } from '../../src/models/User.js'
import { verifyPassword } from '../../src/services/password.service.js'
import { createLogger } from '../../src/utils/logger.js'
import { TEST_PASSWORD, cookieHeader, createTestUser, readSetCookie, testDatabaseUrl, useTestDatabase } from '../helpers/authFixtures.js'
import { FRONTEND_ORIGIN, buildTestConfig, withAuth } from '../helpers/testConfig.js'

const NEW_PASSWORD = 'Cactus-rouge-Lune-9034'
const logger = createLogger({ level: 'silent', environment: 'test' })
const config = withAuth(buildTestConfig(), {
  loginRateLimit: { windowMs: 60_000, max: 1000 },
  sensitiveActionRateLimit: { windowMs: 60_000, max: 1000 },
})

describe.skipIf(!testDatabaseUrl())('API /api/v1/users (base de test)', () => {
  const { database } = useTestDatabase()
  let app
  let mohamed
  let cheikh

  beforeAll(() => {
    app = createApp({ config, logger, database })
  })

 
beforeEach(async () => {
  ({ user: mohamed } = await createTestUser({
    partnerNumber: 1,
    name: 'Mohamed Bakhoum',
    email: 'mohamed@example.com',
  }));

  ({ user: cheikh } = await createTestUser({
    partnerNumber: 2,
    name: 'Cheikh Sow',
    email: 'cheikh@example.com',
  }));
});

  async function loginAs(user, target = app) {
    const res = await request(target).post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD })
    expect(res.status).toBe(200)
    return { access: readSetCookie(res, 'dc_access').value, refresh: readSetCookie(res, 'dc_refresh').value }
  }
  const cookies = (s) => cookieHeader({ dc_access: s.access, dc_refresh: s.refresh })
  const call = (method, path, s, body) => {
    let req = request(app)[method](path).set('Origin', FRONTEND_ORIGIN).set('Cookie', cookies(s))
    if (body !== undefined) req = req.send(body)
    return req
  }
  const activeSessions = (user) => Session.countDocuments({ user: user._id, revokedAt: null })

  function expectNoSecrets(res) {
    const text = res.text
    for (const forbidden of ['passwordHash', '$argon2', 'refreshTokenHash', 'failedLoginAttempts', 'lockedUntil', TEST_PASSWORD, NEW_PASSWORD]) {
      expect(text).not.toContain(forbidden)
    }
  }

  describe('protection des routes', () => {
    const routes = [
      ['get', '/api/v1/users'],
      ['get', '/api/v1/users/507f1f77bcf86cd799439011'],
      ['patch', '/api/v1/users/me'],
      ['patch', '/api/v1/users/me/email'],
      ['patch', '/api/v1/users/me/password'],
      ['post', '/api/v1/users/507f1f77bcf86cd799439011/deactivate'],
      ['post', '/api/v1/users/507f1f77bcf86cd799439011/activate'],
    ]
    it.each(routes)('%s %s sans authentification → 401', async (method, path) => {
      const res = await request(app)[method](path).set('Origin', FRONTEND_ORIGIN).send({})
      expect(res.status).toBe(401)
    })

    it('aucune route publique de création de compte ni de suppression', async () => {
      const s = await loginAs(mohamed)
      for (const [method, path] of [
        ['post', '/api/auth/register'], ['post', '/api/auth/signup'], ['post', '/api/v1/users'],
        ['post', '/api/v1/auth/register'], ['delete', `/api/v1/users/${cheikh._id}`],
      ]) {
        const res = await request(app)[method](path).set('Origin', FRONTEND_ORIGIN).set('Cookie', cookies(s)).send({ name: 'Intrus', email: 'intrus@example.com' })
        expect([404, 405]).toContain(res.status)
      }
      expect(await User.countDocuments()).toBe(2)
    })

    it('les chemins inconnus de /api/v1 restent en 404 sans authentification', async () => {
      expect((await request(app).get('/api/v1/inconnu')).status).toBe(404)
    })
  })

  describe('lecture', () => {
    it('liste les deux associés, sans donnée sensible, identiques pour les deux', async () => {
      for (const user of [mohamed, cheikh]) {
        const res = await call('get', '/api/v1/users', await loginAs(user))
        expect(res.status).toBe(200)
        expect(res.body.data.users.map((u) => u.partnerNumber)).toEqual([1, 2])
        expect(Object.keys(res.body.data.users[0]).sort()).toEqual(['email', 'id', 'lastLoginAt', 'name', 'partnerNumber', 'status'])
        expectNoSecrets(res)
      }
    })

    it('lit un associé par identifiant ; identifiant invalide ou inconnu → 404', async () => {
      const s = await loginAs(mohamed)
      const res = await call('get', `/api/v1/users/${cheikh._id}`, s)
      expect(res.status).toBe(200)
      expect(res.body.data.user.name).toBe('Cheikh Sow')
      expectNoSecrets(res)
      expect((await call('get', '/api/v1/users/pas-un-id', s)).status).toBe(404)
      expect((await call('get', '/api/v1/users/507f1f77bcf86cd799439011', s)).status).toBe(404)
    })
  })

  describe('profil', () => {
    it('modifie le nom et journalise', async () => {
      const s = await loginAs(mohamed)
      const res = await call('patch', '/api/v1/users/me', s, { name: 'Mohamed B. Bakhoum' })
      expect(res.status).toBe(200)
      expect(res.body.data.user.name).toBe('Mohamed B. Bakhoum')
      expect(await AuditLog.countDocuments({ action: 'USER_PROFILE_UPDATED' })).toBe(1)
    })

    it('refuse rôle, numéro d’associé, statut, email ou empreinte dans le profil', async () => {
      const s = await loginAs(mohamed)
      for (const extra of [{ role: 'admin' }, { partnerNumber: 2 }, { status: 'DISABLED' }, { email: 'x@example.com' }, { passwordHash: 'x' }]) {
        expect((await call('patch', '/api/v1/users/me', s, { name: 'Nouveau Nom', ...extra })).status).toBe(400)
      }
      const fresh = await User.findById(mohamed._id)
      expect([fresh.partnerNumber, fresh.status, fresh.email]).toEqual([1, 'ACTIVE', 'mohamed@example.com'])
    })
  })

  describe('changement d’email', () => {
    it('change l’email (normalisé), garde la session courante, révoque les autres, journalise', async () => {
      const current = await loginAs(mohamed)
      await loginAs(mohamed)
      expect(await activeSessions(mohamed)).toBe(2)

      const res = await call('patch', '/api/v1/users/me/email', current, { email: '  Nouveau@Example.COM ', currentPassword: TEST_PASSWORD })
      expect(res.status).toBe(200)
      expect(res.body.data.user.email).toBe('nouveau@example.com')
      expect(await activeSessions(mohamed)).toBe(1)
      expect((await call('get', '/api/auth/me', current)).status).toBe(200)

      const audit = await AuditLog.findOne({ action: 'USER_EMAIL_CHANGED' }).lean()
      expect(audit.before.email).toBe('mohamed@example.com')
      expect(audit.after.email).toBe('nouveau@example.com')
      const login = await request(app).post('/api/auth/login').send({ email: 'nouveau@example.com', password: TEST_PASSWORD })
      expect(login.status).toBe(200)
    })

    it('refuse un mauvais mot de passe actuel (403), un email déjà utilisé (409), un email inchangé (409)', async () => {
      const s = await loginAs(mohamed)
      expect((await call('patch', '/api/v1/users/me/email', s, { email: 'n@example.com', currentPassword: 'faux-faux-faux' })).status).toBe(403)
      const used = await call('patch', '/api/v1/users/me/email', s, { email: 'CHEIKH@example.com', currentPassword: TEST_PASSWORD })
      expect([used.status, used.body.error.code]).toEqual([409, 'EMAIL_ALREADY_USED'])
      expect((await call('patch', '/api/v1/users/me/email', s, { email: 'mohamed@example.com', currentPassword: TEST_PASSWORD })).status).toBe(409)
      expect((await call('patch', '/api/v1/users/me/email', s, { email: 'pas-un-email', currentPassword: TEST_PASSWORD })).status).toBe(400)
      expect((await User.findById(mohamed._id)).email).toBe('mohamed@example.com')
    })
  })

  describe('changement de mot de passe', () => {
    it('change en Argon2id, révoque les autres sessions, réinitialise le verrou, journalise sans secret', async () => {
      const current = await loginAs(mohamed)
      await loginAs(mohamed)
      await User.updateOne({ _id: mohamed._id }, { failedLoginAttempts: 3 })

      const res = await call('patch', '/api/v1/users/me/password', current, { currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD })
      expect(res.status).toBe(200)
      expectNoSecrets(res)

      const user = await User.findById(mohamed._id).select('+passwordHash')
      expect(user.passwordHash.startsWith('$argon2id$')).toBe(true)
      expect(await verifyPassword(user.passwordHash, NEW_PASSWORD)).toBe(true)
      expect(await verifyPassword(user.passwordHash, TEST_PASSWORD)).toBe(false)
      expect(user.failedLoginAttempts).toBe(0)
      expect(user.passwordChangedAt).toBeTruthy()
      expect(await activeSessions(mohamed)).toBe(1)
      expect((await Session.countDocuments({ user: mohamed._id, revokedReason: 'PASSWORD_CHANGED' }))).toBe(1)

      const audits = JSON.stringify(await AuditLog.find({ action: 'USER_PASSWORD_CHANGED' }).lean())
      expect(audits).toContain('USER_PASSWORD_CHANGED')
      expect(audits).not.toContain(NEW_PASSWORD)
      expect(audits).not.toContain('argon2')

      expect((await request(app).post('/api/auth/login').send({ email: mohamed.email, password: TEST_PASSWORD })).status).toBe(401)
      expect((await request(app).post('/api/auth/login').send({ email: mohamed.email, password: NEW_PASSWORD })).status).toBe(200)
    })

    it('refuse mauvais mot de passe actuel, mot de passe faible ou identique', async () => {
      const s = await loginAs(mohamed)
      expect((await call('patch', '/api/v1/users/me/password', s, { currentPassword: 'faux-faux-faux', newPassword: NEW_PASSWORD })).status).toBe(403)
      for (const weak of ['court', 'aaaaaaaaaaaaaaaa', 'Super-bakhoum-9182', TEST_PASSWORD]) {
        const res = await call('patch', '/api/v1/users/me/password', s, { currentPassword: TEST_PASSWORD, newPassword: weak })
        expect(res.status).toBe(400)
        expect(res.text).not.toContain(weak.length > 8 ? weak : '\u0000')
      }
      const user = await User.findById(mohamed._id).select('+passwordHash')
      expect(await verifyPassword(user.passwordHash, TEST_PASSWORD)).toBe(true)
    })
  })

  describe('désactivation / réactivation', () => {
    it('désactive l’autre associé : sessions révoquées, connexion bloquée, données financières conservées', async () => {
      const sM = await loginAs(mohamed)
      const sC = await loginAs(cheikh)
      await loginAs(cheikh)
      await Contribution.collection.insertOne({ partner: cheikh._id, amount: 50000, contributionDate: '2026-01-05', recordedBy: cheikh._id, createdAt: new Date(), updatedAt: new Date() })

      const res = await call('post', `/api/v1/users/${cheikh._id}/deactivate`, sM, { currentPassword: TEST_PASSWORD })
      expect(res.status).toBe(200)
      expect(res.body.data.user.status).toBe('DISABLED')
      expectNoSecrets(res)

      expect(await activeSessions(cheikh)).toBe(0)
      expect(await Session.countDocuments({ user: cheikh._id, revokedReason: 'ACCOUNT_DISABLED' })).toBe(2)
      expect((await call('get', '/api/auth/me', sC)).status).toBe(401)
      expect((await request(app).post('/api/auth/login').send({ email: cheikh.email, password: TEST_PASSWORD })).status).toBe(401)

      expect(await User.countDocuments()).toBe(2)
      expect(await Contribution.countDocuments({ partner: cheikh._id })).toBe(1)
      expect(await AuditLog.countDocuments({ action: 'USER_DEACTIVATED' })).toBe(1)

      const back = await call('post', `/api/v1/users/${cheikh._id}/activate`, sM, { currentPassword: TEST_PASSWORD })
      expect(back.status).toBe(200)
      expect(back.body.data.user.status).toBe('ACTIVE')
      expect((await request(app).post('/api/auth/login').send({ email: cheikh.email, password: TEST_PASSWORD })).status).toBe(200)
      expect(await AuditLog.countDocuments({ action: 'USER_ACTIVATED' })).toBe(1)
    })

    it('les deux associés ont les mêmes droits (Cheikh peut désactiver Mohamed)', async () => {
      const sC = await loginAs(cheikh)
      expect((await call('post', `/api/v1/users/${mohamed._id}/deactivate`, sC, { currentPassword: TEST_PASSWORD })).status).toBe(200)
    })

    it('on ne peut pas se désactiver soi-même : au moins un compte reste actif', async () => {
      const s = await loginAs(mohamed)
      const res = await call('post', `/api/v1/users/${mohamed._id}/deactivate`, s, { currentPassword: TEST_PASSWORD })
      expect([res.status, res.body.error.code]).toEqual([409, 'CANNOT_CHANGE_OWN_STATUS'])
      expect((await User.findById(mohamed._id)).status).toBe('ACTIVE')
    })

    it('exige le mot de passe de l’auteur (403) et un identifiant existant (404) ; répéter l’action ne change rien', async () => {
      const s = await loginAs(mohamed)
      expect((await call('post', `/api/v1/users/${cheikh._id}/deactivate`, s, { currentPassword: 'faux-faux-faux' })).status).toBe(403)
      expect((await call('post', '/api/v1/users/507f1f77bcf86cd799439011/deactivate', s, { currentPassword: TEST_PASSWORD })).status).toBe(404)
      expect((await call('post', `/api/v1/users/${cheikh._id}/activate`, s, { currentPassword: TEST_PASSWORD })).status).toBe(200)
      expect(await AuditLog.countDocuments({ action: 'USER_ACTIVATED' })).toBe(0)
      expect((await User.findById(cheikh._id)).status).toBe('ACTIVE')
    })
  })

  describe('garde-fous', () => {
    it('refuse une écriture depuis une origine non autorisée', async () => {
      const s = await loginAs(mohamed)
      const res = await request(app).patch('/api/v1/users/me').set('Origin', 'https://evil.example').set('Cookie', cookies(s)).send({ name: 'Nouveau Nom' })
      expect(res.status).toBe(403)
    })

    it('limite les tentatives répétées sur les actions sensibles (429)', async () => {
      const limited = createApp({ config: withAuth(config, { sensitiveActionRateLimit: { windowMs: 60_000, max: 2 } }), logger, database })
      const s = await loginAs(mohamed, limited)
      const statuses = []
      for (let i = 0; i < 4; i += 1) {
        const res = await request(limited).patch('/api/v1/users/me/password').set('Origin', FRONTEND_ORIGIN).set('Cookie', cookies(s)).send({ currentPassword: 'faux-faux-faux', newPassword: NEW_PASSWORD })
        statuses.push(res.status)
      }
      expect(statuses).toEqual([403, 403, 429, 429])
    })

    it('un compte désactivé ne peut plus appeler l’API avec un ancien jeton', async () => {
      const sC = await loginAs(cheikh)
      await User.updateOne({ _id: cheikh._id }, { status: 'DISABLED' })
      expect((await call('get', '/api/v1/users', sC)).status).toBe(401)
    })
  })
})
