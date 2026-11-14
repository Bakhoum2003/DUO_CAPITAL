// API /api/v1/contributions contre une VRAIE base de test isolée (jamais DATABASE_URL, jamais Atlas).
// Horloge fixée au 20 décembre 2026 ; fonds démarrant en 2026-12. Aucune donnée réelle n'est touchée.

import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { AuditLog } from '../../src/models/AuditLog.js'
import { Contribution } from '../../src/models/Contribution.js'
import { IdempotencyKey } from '../../src/models/IdempotencyKey.js'
import { Session } from '../../src/models/Session.js'
import { createLogger } from '../../src/utils/logger.js'
import { TEST_PASSWORD, cookieHeader, createTestUser, readSetCookie, testDatabaseUrl, useTestDatabase } from '../helpers/authFixtures.js'
import { FRONTEND_ORIGIN, buildTestConfig, withAuth } from '../helpers/testConfig.js'

const logger = createLogger({ level: 'silent', environment: 'test' })
const rate = { loginRateLimit: { windowMs: 60_000, max: 1000 }, sensitiveActionRateLimit: { windowMs: 60_000, max: 1000 } }
const config = withAuth(buildTestConfig({ FUND_START_PERIOD: '2026-12' }), rate)
const configWithoutStart = withAuth(buildTestConfig(), rate)
const clock = () => new Date('2026-12-20T10:00:00.000Z')
const BASE = '/api/v1/contributions'

let keyCounter = 0
const newKey = () => `test-key-${String(++keyCounter).padStart(6, '0')}`

describe.skipIf(!testDatabaseUrl())('API /api/v1/contributions (base de test)', () => {
  const { database } = useTestDatabase()
  let app
  let mohamed
  let cheikh

  beforeAll(async () => {
    await Promise.all([Contribution, IdempotencyKey].map((model) => model.init())) // collections et index uniques prêts avant les transactions
    app = createApp({ config, logger, database, clock })
  })

  beforeEach(async () => {
    ;({ user: mohamed } = await createTestUser({ partnerNumber: 1, name: 'Mohamed Bakhoum', email: 'mohamed@example.com' }))
    ;({ user: cheikh } = await createTestUser({ partnerNumber: 2, name: 'Cheikh Sow', email: 'cheikh@example.com' }))
  })

  async function session(user, target = app) {
    const res = await request(target).post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD })
    expect(res.status).toBe(200)
    return cookieHeader({ dc_access: readSetCookie(res, 'dc_access').value, dc_refresh: readSetCookie(res, 'dc_refresh').value })
  }
  const get = (path, cookie) => request(app).get(path).set('Cookie', cookie)
  const post = (body, cookie, key = newKey()) => {
    let req = request(app).post(BASE).set('Origin', FRONTEND_ORIGIN).set('Cookie', cookie)
    if (key) req = req.set('Idempotency-Key', key)
    return req.send(body)
  }
  const payload = (partner, overrides = {}) => ({ partnerId: String(partner._id), amount: 15000, contributionDate: '2026-12-05', period: '2026-12', ...overrides })

  describe('protection', () => {
    it('refuse tout accès sans authentification (401)', async () => {
      expect((await request(app).get(BASE)).status).toBe(401)
      expect((await request(app).get(`${BASE}/summary`)).status).toBe(401)
      expect((await request(app).get(`${BASE}/507f1f77bcf86cd799439011`)).status).toBe(401)
      const res = await request(app).post(BASE).set('Origin', FRONTEND_ORIGIN).set('Idempotency-Key', newKey()).send(payload(mohamed))
      expect(res.status).toBe(401)
      expect(await Contribution.countDocuments()).toBe(0)
    })

    it('refuse une session révoquée (401), en lecture comme en écriture', async () => {
      const cookie = await session(mohamed)
      await Session.updateMany({ user: mohamed._id }, { $set: { revokedAt: new Date(), revokedReason: 'LOGOUT' } })
      expect((await get(BASE, cookie)).status).toBe(401)
      expect((await post(payload(mohamed), cookie)).status).toBe(401)
      expect(await Contribution.countDocuments()).toBe(0)
    })

    it('aucune route de modification ni de suppression (historique immuable)', async () => {
      const cookie = await session(mohamed)
      const created = (await post(payload(mohamed), cookie)).body.data.contribution
      for (const method of ['patch', 'put', 'delete']) {
        const res = await request(app)[method](`${BASE}/${created.id}`).set('Origin', FRONTEND_ORIGIN).set('Cookie', cookie).send({ amount: 1 })
        expect(res.status).toBe(404)
      }
      expect((await Contribution.findById(created.id)).amount).toBe(15000)
    })
  })

  describe('enregistrement', () => {
    it('enregistre une cotisation valide : auteur issu de la session, audit écrit, aucun secret', async () => {
      const cookie = await session(mohamed)
      const res = await post(payload(cheikh, { note: ' Virement ' }), cookie)
      expect(res.status).toBe(201)
      const { contribution } = res.body.data
      expect(contribution).toMatchObject({ amount: 15000, contributionDate: '2026-12-05', period: '2026-12', note: 'Virement' })
      expect(contribution.partner.name).toBe('Cheikh Sow')
      expect(contribution.recordedBy.name).toBe('Mohamed Bakhoum')
      for (const forbidden of ['passwordHash', '$argon2', 'email', 'mohamed@example.com', 'refreshTokenHash']) expect(res.text).not.toContain(forbidden)

      const stored = await Contribution.findById(contribution.id)
      expect(String(stored.recordedBy)).toBe(String(mohamed._id))
      expect(stored.deletedAt).toBeNull()

      const audit = await AuditLog.find({ action: 'CONTRIBUTION_CREATED' })
      expect(audit).toHaveLength(1)
      expect(String(audit[0].actor)).toBe(String(mohamed._id))
      expect(String(audit[0].resourceId)).toBe(contribution.id)
    })

    it('les deux associés ont exactement les mêmes droits (chacun peut enregistrer pour chacun)', async () => {
      const a = await post(payload(cheikh), await session(mohamed))
      const b = await post(payload(mohamed), await session(cheikh))
      expect([a.status, b.status]).toEqual([201, 201])
      expect(b.body.data.contribution.recordedBy.name).toBe('Cheikh Sow')
    })

    it('conserve intégralement un montant supérieur à 15 000 FCFA', async () => {
      const cookie = await session(mohamed)
      const res = await post(payload(mohamed, { amount: 20000 }), cookie)
      expect(res.status).toBe(201)
      expect((await Contribution.findById(res.body.data.contribution.id)).amount).toBe(20000)
      const summary = (await get(`${BASE}/summary`, cookie)).body.data
      expect(summary.partners[0]).toMatchObject({ paid: 20000, settled: 15000, excess: 5000 })
    })

    it('accepte plusieurs versements pour un même mois et garde chaque ligne', async () => {
      const cookie = await session(mohamed)
      for (const amount of [5000, 4000, 6000]) expect((await post(payload(mohamed, { amount }), cookie)).status).toBe(201)
      expect(await Contribution.countDocuments({ partner: mohamed._id, period: '2026-12' })).toBe(3)
      const list = (await get(BASE, cookie)).body
      expect(list.data.contributions.map((item) => item.amount).sort()).toEqual([4000, 5000, 6000])
      expect((await get(`${BASE}/summary`, cookie)).body.data.partners[0]).toMatchObject({ paid: 15000, settled: 15000, paidMonths: 1 })
    })

    it.each([
      ['montant nul', { amount: 0 }],
      ['montant négatif', { amount: -100 }],
      ['montant décimal', { amount: 10.5 }],
      ['montant texte', { amount: 'beaucoup' }],
      ['date invalide', { contributionDate: '2026-12-32' }],
      ['mois invalide', { period: '2026-00' }],
      ['identifiant invalide', { partnerId: 'abc' }],
      ['champ non autorisé', { recordedBy: 'a'.repeat(24) }],
    ])('refuse : %s (400)', async (_label, overrides) => {
      const res = await post(payload(mohamed, overrides), await session(mohamed))
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(await Contribution.countDocuments()).toBe(0)
    })

    it('refuse un associé inexistant (404) et un associé désactivé (409)', async () => {
      const cookie = await session(mohamed)
      const ghost = await post({ ...payload(mohamed), partnerId: '507f1f77bcf86cd799439011' }, cookie)
      expect([ghost.status, ghost.body.error.code]).toEqual([404, 'PARTNER_NOT_FOUND'])

      await cheikh.updateOne({ status: 'DISABLED' })
      const disabled = await post(payload(cheikh), cookie)
      expect([disabled.status, disabled.body.error.code]).toEqual([409, 'PARTNER_DISABLED'])
      expect(await Contribution.countDocuments()).toBe(0)
    })

    it('refuse les dates et mois incohérents', async () => {
      const cookie = await session(mohamed)
      const cases = [
        [{ contributionDate: '2026-11-20', period: '2026-12' }, 'BEFORE_FUND_START'],
        [{ period: '2026-11' }, 'PERIOD_BEFORE_FUND_START'],
        [{ contributionDate: '2026-12-21' }, 'CONTRIBUTION_DATE_IN_FUTURE'],
        [{ period: '2027-01' }, 'PERIOD_IN_FUTURE'],
      ]
      for (const [overrides, code] of cases) {
        const res = await post(payload(mohamed, overrides), cookie)
        expect([res.status, res.body.error.code]).toEqual([422, code])
      }
      expect(await Contribution.countDocuments()).toBe(0)
    })

    it('sans FUND_START_PERIOD configuré, rien ne s\'enregistre', async () => {
      const other = createApp({ config: configWithoutStart, logger, database, clock })
      const cookie = await session(mohamed, other)
      const res = await request(other).post(BASE).set('Origin', FRONTEND_ORIGIN).set('Cookie', cookie).set('Idempotency-Key', newKey()).send(payload(mohamed))
      expect([res.status, res.body.error.code]).toEqual([409, 'FUND_START_NOT_CONFIGURED'])
    })

    it('exige une clé d\'idempotence valide', async () => {
      const cookie = await session(mohamed)
      for (const key of [null, 'court']) {
        const res = await post(payload(mohamed), cookie, key)
        expect([res.status, res.body.error.code]).toEqual([400, 'IDEMPOTENCY_KEY_REQUIRED'])
      }
    })
  })

  describe('doubles soumissions et doublons', () => {
    it('rejoue la même clé : une seule cotisation, même réponse, une seule entrée d\'audit', async () => {
      const cookie = await session(mohamed)
      const key = newKey()
      const first = await post(payload(mohamed), cookie, key)
      const second = await post(payload(mohamed), cookie, key)
      expect([first.status, second.status]).toEqual([201, 201])
      expect(second.headers['idempotent-replayed']).toBe('true')
      expect(second.body.data.contribution.id).toBe(first.body.data.contribution.id)
      expect(await Contribution.countDocuments()).toBe(1)
      expect(await AuditLog.countDocuments({ action: 'CONTRIBUTION_CREATED' })).toBe(1)
    })

    it('deux envois simultanés avec la même clé : une seule cotisation', async () => {
      const cookie = await session(mohamed)
      const key = newKey()
      const results = await Promise.all([post(payload(mohamed), cookie, key), post(payload(mohamed), cookie, key)])
      expect(results.every((res) => [201, 409].includes(res.status))).toBe(true)
      expect(results.some((res) => res.status === 201)).toBe(true)
      expect(await Contribution.countDocuments()).toBe(1)
    })

    it('une clé réutilisée pour une autre cotisation est refusée (422)', async () => {
      const cookie = await session(mohamed)
      const key = newKey()
      await post(payload(mohamed), cookie, key)
      const res = await post(payload(mohamed, { amount: 99999 }), cookie, key)
      expect([res.status, res.body.error.code]).toEqual([422, 'IDEMPOTENCY_KEY_REUSED'])
      expect(await Contribution.countDocuments()).toBe(1)
    })

    it('un versement identique récent avec une autre clé est suspecté ; la confirmation explicite l\'autorise', async () => {
      const cookie = await session(mohamed)
      await post(payload(mohamed), cookie)
      const duplicate = await post(payload(mohamed), cookie)
      expect([duplicate.status, duplicate.body.error.code]).toEqual([409, 'DUPLICATE_SUSPECTED'])
      expect(await Contribution.countDocuments()).toBe(1)
      expect(await IdempotencyKey.countDocuments()).toBe(1) // l'échec n'a laissé aucune réservation

      const confirmed = await post(payload(mohamed, { confirmDuplicate: true }), cookie)
      expect(confirmed.status).toBe(201)
      expect(await Contribution.countDocuments()).toBe(2)
    })

    it('un échec de validation ne consomme pas la clé : elle peut resservir après correction', async () => {
      const cookie = await session(mohamed)
      const key = newKey()
      expect((await post(payload(mohamed, { amount: 0 }), cookie, key)).status).toBe(400)
      expect((await post(payload(mohamed), cookie, key)).status).toBe(201)
    })
  })

  describe('consultation', () => {
    async function seed(cookie) {
      const rows = [
        [mohamed, 15000, '2026-12-05', '2026-12'],
        [cheikh, 15000, '2026-12-06', '2026-12'],
        [mohamed, 7000, '2026-12-10', '2026-12'],
        [cheikh, 3000, '2026-12-18', '2026-12'],
      ]
      for (const [partner, amount, contributionDate, period] of rows) {
        expect((await post(payload(partner, { amount, contributionDate, period }), cookie)).status).toBe(201)
      }
    }

    it('liste triée du plus récent au plus ancien, avec pagination et total filtré', async () => {
      const cookie = await session(cheikh)
      await seed(cookie)
      const page1 = (await get(`${BASE}?pageSize=3`, cookie)).body
      expect(page1.data.contributions.map((item) => item.contributionDate)).toEqual(['2026-12-18', '2026-12-10', '2026-12-06'])
      expect(page1.meta).toMatchObject({ page: 1, pageSize: 3, total: 4, totalPages: 2, filteredAmount: 40000 })
      const page2 = (await get(`${BASE}?pageSize=3&page=2`, cookie)).body
      expect(page2.data.contributions).toHaveLength(1)
    })

    it('filtres : associé, mois, année, période de dates', async () => {
      const cookie = await session(mohamed)
      await seed(cookie)
      const byPartner = (await get(`${BASE}?partnerId=${cheikh._id}`, cookie)).body
      expect(byPartner.data.contributions).toHaveLength(2)
      expect(byPartner.meta.filteredAmount).toBe(18000)
      const partnerPage = (await get(`${BASE}?partnerId=${mohamed._id}&pageSize=1`, cookie)).body
      expect(partnerPage.data.contributions).toHaveLength(1) // une seule ligne affichée…
      expect(partnerPage.meta).toMatchObject({ total: 2, totalPages: 2, filteredAmount: 22000 }) // …mais le montant couvre tout le filtre
      expect((await get(`${BASE}?period=2026-12`, cookie)).body.meta.total).toBe(4)
      expect((await get(`${BASE}?period=2027-01`, cookie)).body.meta.total).toBe(0)
      expect((await get(`${BASE}?year=2026`, cookie)).body.meta.total).toBe(4)
      expect((await get(`${BASE}?year=2027`, cookie)).body.meta.total).toBe(0)
      expect((await get(`${BASE}?year=2027&period=2026-12`, cookie)).body.meta.total).toBe(0)
      expect((await get(`${BASE}?from=2026-12-06&to=2026-12-10`, cookie)).body.meta.total).toBe(2)
      expect((await get(`${BASE}?partnerId=${mohamed._id}&from=2026-12-08`, cookie)).body.meta.total).toBe(1)
    })

    it('liste vide : 200 avec zéro résultat (jamais de fausses données)', async () => {
      const res = await get(BASE, await session(mohamed))
      expect(res.status).toBe(200)
      expect(res.body.data.contributions).toEqual([])
      expect(res.body.meta.total).toBe(0)
    })

    it('refuse les filtres invalides ou malveillants (400)', async () => {
      const cookie = await session(mohamed)
      for (const query of ['pageSize=1000', 'page=0', 'period=2026-13', 'year=abc', 'from=2026-12-10&to=2026-12-01', 'partnerId=x', 'partnerId[$ne]=x', 'foo=bar']) {
        const res = await get(`${BASE}?${query}`, cookie)
        expect([query, res.status]).toEqual([query, 400])
      }
    })

    it('détail d\'une cotisation, 404 si inconnue ou mal formée', async () => {
      const cookie = await session(mohamed)
      const created = (await post(payload(mohamed), cookie)).body.data.contribution
      const found = await get(`${BASE}/${created.id}`, cookie)
      expect(found.status).toBe(200)
      expect(found.body.data.contribution.id).toBe(created.id)
      expect((await get(`${BASE}/507f1f77bcf86cd799439011`, cookie)).status).toBe(404)
      expect((await get(`${BASE}/pas-un-id`, cookie)).status).toBe(404)
    })

    it('une cotisation supprimée logiquement disparaît des listes, du détail et des statistiques', async () => {
      const cookie = await session(mohamed)
      const created = (await post(payload(mohamed), cookie)).body.data.contribution
      await Contribution.collection.updateOne({ _id: (await Contribution.findById(created.id))._id }, { $set: { deletedAt: new Date() } })
      expect((await get(BASE, cookie)).body.meta.total).toBe(0)
      expect((await get(`${BASE}/${created.id}`, cookie)).status).toBe(404)
      expect((await get(`${BASE}/summary`, cookie)).body.data.collective.paid).toBe(0)
    })

    it('Mohamed et Cheikh voient les mêmes listes et les mêmes statistiques', async () => {
      const a = await session(mohamed)
      await seed(a)
      const b = await session(cheikh)
      const strip = (body) => ({ ...body.data, generatedAt: undefined })
      expect((await get(BASE, a)).body).toEqual((await get(BASE, b)).body)
      expect(strip((await get(`${BASE}/summary`, a)).body)).toEqual(strip((await get(`${BASE}/summary`, b)).body))
    })
  })

  describe('statistiques et Dashboard', () => {
    it('statistiques : objectifs, versé réel, reste à verser, taux, par associé et collectif', async () => {
      const cookie = await session(mohamed)
      await post(payload(mohamed, { amount: 15000 }), cookie)
      await post(payload(cheikh, { amount: 6000 }), cookie)
      const data = (await get(`${BASE}/summary`, cookie)).body.data
      expect(data).toMatchObject({ fundStarted: true, monthsCount: 1, monthlyTargetCollective: 30000, currency: 'XOF' })
      expect(data.partners.map((p) => [p.name, p.paid, p.remaining, p.realizationRate])).toEqual([
        ['Mohamed Bakhoum', 15000, 0, 100],
        ['Cheikh Sow', 6000, 9000, 40],
      ])
      expect(data.collective).toMatchObject({ paid: 21000, objective: 30000, remaining: 9000, realizationRate: 70 })
      expect(data.months[0]).toMatchObject({ period: '2026-12', isCurrent: true, isOverdue: false })
    })

    it('le Dashboard reflète la cotisation sans la compter deux fois', async () => {
      const cookie = await session(mohamed)
      const before = (await get('/api/v1/dashboard', cookie)).body.data
      expect(before.capital.totalToDate).toBe(0)

      const key = newKey()
      await post(payload(cheikh, { amount: 20000 }), cookie, key)
      await post(payload(cheikh, { amount: 20000 }), cookie, key) // rejeu : aucun second encaissement
      const after = (await get('/api/v1/dashboard', cookie)).body.data
      expect(after.capital.totalToDate).toBe(20000)
      expect(after.treasury.balance).toBe(20000)
      expect(after.capital.byPartner.find((p) => p.name === 'Cheikh Sow').amount).toBe(20000)
      expect(after.recentActivities.filter((a) => a.kind === 'CONTRIBUTION')).toHaveLength(1)
      expect(after.contributions.partners.find((p) => p.name === 'Cheikh Sow')).toMatchObject({ paidToDate: 20000 })
    })
  })
})
