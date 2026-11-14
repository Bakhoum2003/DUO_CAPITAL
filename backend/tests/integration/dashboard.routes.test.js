// GET /api/v1/dashboard contre une VRAIE base de test isolée : jamais DATABASE_URL, jamais Atlas.
// Les données sont insérées uniquement dans la base de test éphémère, puis cette base est supprimée par useTestDatabase.

import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { Business } from '../../src/models/Business.js'
import { BusinessOperation } from '../../src/models/BusinessOperation.js'
import { Contribution } from '../../src/models/Contribution.js'
import { Withdrawal } from '../../src/models/Withdrawal.js'
import { createLogger } from '../../src/utils/logger.js'
import { TEST_PASSWORD, cookieHeader, createTestUser, readSetCookie, testDatabaseUrl, useTestDatabase } from '../helpers/authFixtures.js'
import { FRONTEND_ORIGIN, buildTestConfig, withAuth } from '../helpers/testConfig.js'

const logger = createLogger({ level: 'silent', environment: 'test' })
const config = withAuth(buildTestConfig({ FUND_START_PERIOD: '2020-01' }), {
  loginRateLimit: { windowMs: 60_000, max: 1000 },
  sensitiveActionRateLimit: { windowMs: 60_000, max: 1000 },
})
const PAST = '2020-03-10'

describe.skipIf(!testDatabaseUrl())('API /api/v1/dashboard (base de test)', () => {
  const { database } = useTestDatabase()
  let app
  let mohamed
  let cheikh

  beforeAll(() => {
    app = createApp({ config, logger, database })
  })

  beforeEach(async () => {
    ;({ user: mohamed } = await createTestUser({ partnerNumber: 1, name: 'Mohamed Bakhoum', email: 'mohamed@example.com' }))
    ;({ user: cheikh } = await createTestUser({ partnerNumber: 2, name: 'Cheikh Sow', email: 'cheikh@example.com' }))
  })

  async function session(user) {
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD })
    expect(res.status).toBe(200)
    return cookieHeader({ dc_access: readSetCookie(res, 'dc_access').value, dc_refresh: readSetCookie(res, 'dc_refresh').value })
  }
  const get = (path, cookie) => {
    const req = request(app).get(path)
    return cookie ? req.set('Cookie', cookie) : req
  }

  // Insertion brute dans la base de test uniquement (contourne les validations d'écriture : c'est la lecture qui est testée).
  async function seed() {
    const [activity] = await Business.collection.insertMany([{ name: 'Boissons', category: 'Alimentation', status: 'ACTIVE', startDate: PAST, createdAt: new Date(), updatedAt: new Date() }]).then((r) => Object.values(r.insertedIds))
    await Contribution.collection.insertMany([
      { partner: mohamed._id, amount: 15000, contributionDate: PAST, period: '2020-03', deletedAt: null, createdAt: new Date() },
      { partner: cheikh._id, amount: 15000, contributionDate: PAST, period: '2020-03', deletedAt: null, createdAt: new Date() },
      { partner: cheikh._id, amount: 99999, contributionDate: PAST, period: '2020-04', deletedAt: new Date(), createdAt: new Date() }, // supprimée : ignorée
      { partner: cheikh._id, amount: 15000, contributionDate: '2999-01-01', period: '2999-01', deletedAt: null, createdAt: new Date() }, // future : ignorée
    ])
    await BusinessOperation.collection.insertMany([
      { business: activity, type: 'INVESTMENT', amount: 20000, operationDate: PAST, description: 'Matériel', deletedAt: null, createdAt: new Date() },
      { business: activity, type: 'EXPENSE', amount: 3000, operationDate: PAST, description: 'Transport', deletedAt: null, createdAt: new Date() },
      { business: activity, type: 'REVENUE', amount: 40000, operationDate: PAST, description: 'Vente', deletedAt: null, createdAt: new Date() },
      { business: activity, type: 'REVENUE', amount: 77777, operationDate: PAST, description: 'Supprimée', deletedAt: new Date(), createdAt: new Date() },
    ])
    await Withdrawal.collection.insertMany([{ beneficiary: mohamed._id, amount: 5000, withdrawalDate: PAST, reason: 'Retrait', deletedAt: null, createdAt: new Date() }])
  }

  describe('sécurité', () => {
    it('refuse un accès sans session (401) sans rien révéler', async () => {
      const res = await get('/api/v1/dashboard')
      expect(res.status).toBe(401)
      expect(res.body.data).toBeUndefined()
    })

    it('refuse des cookies invalides', async () => {
      const res = await get('/api/v1/dashboard', cookieHeader({ dc_access: 'x', dc_refresh: 'y' }))
      expect(res.status).toBe(401)
    })

    it("n'accepte pas de paramètre d'identité (partnerNumber, userId) : 400", async () => {
      const cookie = await session(mohamed)
      expect((await get('/api/v1/dashboard?partnerNumber=2', cookie)).status).toBe(400)
      expect((await get(`/api/v1/dashboard?userId=${cheikh._id}`, cookie)).status).toBe(400)
    })

    it('ne renvoie aucun secret ni donnée de compte', async () => {
      await seed()
      const res = await get('/api/v1/dashboard', await session(mohamed))
      for (const forbidden of ['passwordHash', '$argon2', 'refreshTokenHash', 'email', 'mohamed@example.com', 'failedLoginAttempts']) {
        expect(res.text).not.toContain(forbidden)
      }
    })
  })

  describe('données communes', () => {
    it('base vide : 200, zéros vrais, hasAnyData faux', async () => {
      const res = await get('/api/v1/dashboard', await session(mohamed))
      expect(res.status).toBe(200)
      expect(res.headers['cache-control']).toContain('no-store')
      expect(res.body.data.hasAnyData).toBe(false)
      expect(res.body.data.treasury.balance).toBe(0)
    })

    it('Mohamed et Cheikh voient exactement les mêmes chiffres', async () => {
      await seed()
      const a = await get('/api/v1/dashboard?period=all', await session(mohamed))
      const b = await get('/api/v1/dashboard?period=all', await session(cheikh))
      expect(a.status).toBe(200)
      expect(b.status).toBe(200)
      const strip = (body) => ({ ...body.data, generatedAt: undefined })
      expect(strip(a.body)).toEqual(strip(b.body))
    })

    it('calculs corrects, suppressions logiques et dates futures exclues', async () => {
      await seed()
      const { data } = (await get('/api/v1/dashboard?period=all', await session(cheikh))).body
      expect(data.capital.totalToDate).toBe(30000)
      expect(data.revenues.total).toBe(40000)
      expect(data.expenses.total).toBe(3000)
      expect(data.investments.total).toBe(20000)
      expect(data.result.amount).toBe(37000)
      expect(data.treasury.balance).toBe(30000 + 40000 - 20000 - 3000 - 5000)
      expect(data.ignoredFutureDated).toBe(1)
      expect(data.currency).toBe('XOF')
    })

    it('les filtres de période fonctionnent (période passée / période vide)', async () => {
      await seed()
      const cookie = await session(mohamed)
      const inRange = await get('/api/v1/dashboard?period=custom&from=2020-03-01&to=2020-03-31', cookie)
      expect(inRange.body.data.revenues.total).toBe(40000)
      const empty = await get('/api/v1/dashboard?period=custom&from=2021-01-01&to=2021-01-31', cookie)
      expect(empty.body.data.revenues.total).toBe(0)
      expect(empty.body.data.hasAnyData).toBe(true) // des données existent, mais pas sur cette période
    })

    it('paramètres invalides : 400 VALIDATION_ERROR', async () => {
      const cookie = await session(mohamed)
      for (const query of ['period=decade', 'period=custom', 'period=custom&from=2026-02-30&to=2026-03-01', 'period=month&from=2026-01-01']) {
        const res = await get(`/api/v1/dashboard?${query}`, cookie)
        expect(res.status).toBe(400)
        expect(res.body.error.code).toBe('VALIDATION_ERROR')
      }
    })

    it('la route est en lecture seule : les écritures sont refusées', async () => {
      const cookie = await session(mohamed)
      const res = await request(app).post('/api/v1/dashboard').set('Origin', FRONTEND_ORIGIN).set('Cookie', cookie).send({})
      expect([404, 405]).toContain(res.status)
    })
  })
})
