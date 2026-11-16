// Horloge métier fixée au 20 décembre 2026. Les enregistrements financiers sont insérés dans la base de test uniquement.
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { AuditLog } from '../../src/models/AuditLog.js'
import { Business } from '../../src/models/Business.js'
import { BusinessOperation } from '../../src/models/BusinessOperation.js'
import { Contribution } from '../../src/models/Contribution.js'
import { IdempotencyKey } from '../../src/models/IdempotencyKey.js'
import { TreasuryLock } from '../../src/models/TreasuryLock.js'
import { User } from '../../src/models/User.js'
import { Withdrawal } from '../../src/models/Withdrawal.js'
import { createLogger } from '../../src/utils/logger.js'
import { TEST_PASSWORD, cookieHeader, createTestUser, readSetCookie, testDatabaseUrl, useTestDatabase } from '../helpers/authFixtures.js'
import { FRONTEND_ORIGIN, buildTestConfig, withAuth } from '../helpers/testConfig.js'

const logger = createLogger({ level: 'silent', environment: 'test' })
const config = withAuth(buildTestConfig({ FUND_START_PERIOD: '2026-12' }), {
  loginRateLimit: { windowMs: 60_000, max: 1000 },
  sensitiveActionRateLimit: { windowMs: 60_000, max: 1000 },
})
const clock = () => new Date('2026-12-20T10:00:00.000Z')
const BASE = '/api/v1/withdrawals'
const FAKE_ID = '507f1f77bcf86cd799439011'

let keyCounter = 0
const newKey = () => `wd-key-${String(++keyCounter).padStart(6, '0')}`

describe.skipIf(!testDatabaseUrl())('API /api/v1/withdrawals (base de test)', () => {
  const { database } = useTestDatabase()
  let app
  let mohamed
  let cheikh
  let cookieMohamed
  let cookieCheikh

  beforeAll(async () => {
    await Promise.all([Business, BusinessOperation, Contribution, Withdrawal, TreasuryLock, IdempotencyKey, AuditLog].map((model) => model.init()))
    app = createApp({ config, logger, database, clock })
  })

  beforeEach(async () => {
    ;({ user: mohamed } = await createTestUser({ partnerNumber: 1, name: 'Mohamed Bakhoum', email: 'mohamed@example.com' }))
    ;({ user: cheikh } = await createTestUser({ partnerNumber: 2, name: 'Cheikh Sow', email: 'cheikh@example.com' }))
    cookieMohamed = await session(mohamed)
    cookieCheikh = await session(cheikh)
  })

  async function session(user) {
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD })
    expect(res.status).toBe(200)
    return cookieHeader({ dc_access: readSetCookie(res, 'dc_access').value, dc_refresh: readSetCookie(res, 'dc_refresh').value })
  }
  const send = (method, path, cookie, body) => {
    let req = request(app)[method](path).set('Origin', FRONTEND_ORIGIN)
    if (cookie) req = req.set('Cookie', cookie)
    return body === undefined ? req : req.send(body)
  }
  const post = (body, cookie, key = newKey()) => {
    let req = request(app).post(BASE).set('Origin', FRONTEND_ORIGIN).set('Cookie', cookie)
    if (key) req = req.set('Idempotency-Key', key)
    return req.send(body)
  }
  const payload = (beneficiary, overrides = {}) => ({ beneficiaryId: String(beneficiary._id), amount: 10000, withdrawalDate: '2026-12-18', ...overrides })

  const base = () => ({ deletedAt: null, createdAt: new Date(), updatedAt: new Date() })
  const addContribution = (partner, amount, contributionDate) =>
    Contribution.collection.insertOne({ partner: partner._id, amount, contributionDate, period: contributionDate.slice(0, 7), note: null, recordedBy: partner._id, ...base() })
  const fund = (amount) => addContribution(mohamed, amount, '2026-12-05')
  const balance = async () => (await send('get', '/api/v1/treasury/summary', cookieMohamed)).body.data.balance
  const counts = async () => ({
    withdrawals: await Withdrawal.collection.countDocuments(),
    audits: await AuditLog.collection.countDocuments({ resourceType: 'WITHDRAWAL' }),
    keys: await IdempotencyKey.collection.countDocuments(),
  })
  const lockVersion = async () => (await TreasuryLock.collection.findOne({ _id: 'FUND' }))?.version ?? 0
  const createOk = async (beneficiary, overrides = {}, cookie = cookieMohamed) => {
    const res = await post(payload(beneficiary, overrides), cookie)
    expect(res.status).toBe(201)
    return res.body.data.withdrawal
  }

  describe('protection', () => {
    it('refuse tout sans authentification (401)', async () => {
      for (const [method, path] of [['get', BASE], ['get', `${BASE}/summary`], ['get', `${BASE}/${FAKE_ID}`], ['patch', `${BASE}/${FAKE_ID}`], ['delete', `${BASE}/${FAKE_ID}`]]) {
        expect((await send(method, path)).status).toBe(401)
      }
      expect((await request(app).post(BASE).set('Origin', FRONTEND_ORIGIN).set('Idempotency-Key', newKey()).send(payload(cheikh))).status).toBe(401)
      expect(await counts()).toEqual({ withdrawals: 0, audits: 0, keys: 0 })
    })

    it('Mohamed et Cheikh ont les mêmes droits : créer, lire, modifier, supprimer', async () => {
      await fund(100000)
      for (const [cookie, other] of [[cookieMohamed, cheikh], [cookieCheikh, mohamed]]) {
        const created = await createOk(other, { amount: 1000 }, cookie)
        expect((await send('get', `${BASE}/${created.id}`, cookie)).status).toBe(200)
        expect((await send('get', BASE, cookie)).status).toBe(200)
        expect((await send('patch', `${BASE}/${created.id}`, cookie, { reason: 'Mis à jour' })).status).toBe(200)
      }
      const [mine] = (await send('get', BASE, cookieMohamed)).body.data.withdrawals
      expect((await send('delete', `${BASE}/${mine.id}`, cookieCheikh)).status).toBe(200) // l'autre associé peut supprimer
    })
  })

  describe('création', () => {
    it("retrait valide : bénéficiaire Cheikh, auteur Mohamed pris dans la session, motif facultatif", async () => {
      await fund(100000)
      const res = await post(payload(cheikh, { reason: '  Loyer  ' }), cookieMohamed)
      expect(res.status).toBe(201)
      expect(res.headers['cache-control']).toBe('no-store')
      expect(res.body.data.withdrawal).toMatchObject({
        beneficiary: { id: String(cheikh._id), name: 'Cheikh Sow', partnerNumber: 2 },
        recordedBy: { id: String(mohamed._id), name: 'Mohamed Bakhoum' },
        amount: 10000,
        withdrawalDate: '2026-12-18',
        reason: 'Loyer',
      })
      expect(JSON.stringify(res.body)).not.toContain('@example.com')
      const stored = await Withdrawal.collection.findOne({})
      expect(String(stored.recordedBy)).toBe(String(mohamed._id))
      expect(String(stored.beneficiary)).toBe(String(cheikh._id))
    })

    it('bénéficiaire Mohamed enregistré par Cheikh : auteur et bénéficiaire restent distincts', async () => {
      await fund(100000)
      const created = await createOk(mohamed, {}, cookieCheikh)
      expect(created.beneficiary.name).toBe('Mohamed Bakhoum')
      expect(created.recordedBy.name).toBe('Cheikh Sow')
    })

    it("l'auteur est celui de la session : un auteur envoyé par le client est refusé", async () => {
      await fund(100000)
      const res = await post({ ...payload(cheikh), recordedBy: String(cheikh._id) }, cookieMohamed)
      expect(res.status).toBe(400)
      expect(await counts()).toEqual({ withdrawals: 0, audits: 0, keys: 0 })
    })

    it('un retrait sans motif est accepté (motif nul)', async () => {
      await fund(100000)
      expect((await createOk(cheikh)).reason).toBeNull()
    })

    it('montants nul, négatif, décimal, texte : 400 sans aucune écriture', async () => {
      await fund(100000)
      for (const amount of [0, -1, 10.5, '1000', null]) {
        const res = await post(payload(cheikh, { amount }), cookieMohamed)
        expect(res.status).toBe(400)
        expect(res.body.error.code).toBe('VALIDATION_ERROR')
      }
      expect(await counts()).toEqual({ withdrawals: 0, audits: 0, keys: 0 })
    })

    it('bénéficiaire invalide : 400 ; bénéficiaire inexistant : 404 ; compte désactivé : 409', async () => {
      await fund(100000)
      expect((await post(payload(cheikh, { beneficiaryId: 'pas-un-identifiant' }), cookieMohamed)).status).toBe(400)
      const missing = await post(payload(cheikh, { beneficiaryId: FAKE_ID }), cookieMohamed)
      expect(missing.status).toBe(404)
      expect(missing.body.error.code).toBe('PARTNER_NOT_FOUND')
      await User.updateOne({ _id: cheikh._id }, { $set: { status: 'DISABLED' } })
      const disabled = await post(payload(cheikh), cookieMohamed)
      expect(disabled.status).toBe(409)
      expect(disabled.body.error.code).toBe('PARTNER_DISABLED')
      expect(await counts()).toEqual({ withdrawals: 0, audits: 0, keys: 0 })
    })

    it("date future : 422 ; date invalide : 400 ; date d'aujourd'hui et passée : acceptées", async () => {
      await fund(100000)
      const future = await post(payload(cheikh, { withdrawalDate: '2026-12-21' }), cookieMohamed)
      expect(future.status).toBe(422)
      expect(future.body.error.code).toBe('OUTFLOW_DATE_IN_FUTURE')
      expect((await post(payload(cheikh, { withdrawalDate: '2026-02-30' }), cookieMohamed)).status).toBe(400)
      expect((await post(payload(cheikh, { withdrawalDate: '20/12/2026' }), cookieMohamed)).status).toBe(400)
      expect(await counts()).toEqual({ withdrawals: 0, audits: 0, keys: 0 })
      await createOk(cheikh, { withdrawalDate: '2026-12-20' })
      await createOk(cheikh, { withdrawalDate: '2026-12-06' })
    })

    it("l'en-tête Idempotency-Key est obligatoire", async () => {
      await fund(100000)
      const res = await post(payload(cheikh), cookieMohamed, null)
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')
    })
  })

  describe('trésorerie', () => {
    it('retrait inférieur au solde : solde final correct, compté une seule fois', async () => {
      await fund(100000)
      await createOk(cheikh, { amount: 30000 })
      expect(await balance()).toBe(70000)
      const summary = (await send('get', '/api/v1/treasury/summary', cookieMohamed)).body.data
      expect(summary.withdrawals).toMatchObject({ amount: 30000, count: 1 })
      expect(summary.outflow).toBe(30000)
      expect(summary.inflow).toBe(100000)
    })

    it('retrait égal au solde accepté (solde 0) ; un franc de plus refusé', async () => {
      await fund(50000)
      const res = await post(payload(cheikh, { amount: 50001 }), cookieMohamed)
      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('INSUFFICIENT_TREASURY')
      expect(res.body.error.message).toMatch(/insuffisante/i)
      await createOk(cheikh, { amount: 50000 })
      expect(await balance()).toBe(0)
      expect((await post(payload(cheikh, { amount: 1 }), cookieMohamed)).status).toBe(409)
    })

    it('trésorerie insuffisante : aucun retrait, aucun audit, aucune clé, verrou non incrémenté', async () => {
      await fund(20000)
      const lockBefore = await lockVersion()
      const res = await post(payload(cheikh, { amount: 20001 }), cookieMohamed)
      expect(res.status).toBe(409)
      expect(await counts()).toEqual({ withdrawals: 0, audits: 0, keys: 0 })
      expect(await lockVersion()).toBe(lockBefore)
      expect(await balance()).toBe(20000)
    })

    it('une trésorerie vide refuse tout retrait', async () => {
      const res = await post(payload(cheikh, { amount: 1 }), cookieMohamed)
      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('INSUFFICIENT_TREASURY')
    })

    it('un retrait supprimé logiquement est exclu du solde, de la liste et des totaux', async () => {
      await fund(100000)
      const created = await createOk(cheikh, { amount: 40000 })
      expect(await balance()).toBe(60000)
      expect((await send('delete', `${BASE}/${created.id}`, cookieCheikh, { reason: 'Erreur de saisie' })).status).toBe(200)
      expect(await balance()).toBe(100000)
      expect((await send('get', BASE, cookieMohamed)).body.meta.total).toBe(0)
      const summary = (await send('get', '/api/v1/treasury/summary', cookieMohamed)).body.data
      expect(summary.withdrawals).toMatchObject({ amount: 0, count: 0 })
      const stored = await Withdrawal.collection.findOne({})
      expect(stored.deletedAt).toBeInstanceOf(Date)
      expect(String(stored.deletedBy)).toBe(String(cheikh._id))
      expect(stored.deletionReason).toBe('Erreur de saisie')
    })

    it('Trésorerie, Dashboard et module Retraits donnent le même solde, pour les deux associés', async () => {
      await fund(100000)
      await createOk(cheikh, { amount: 25000 })
      for (const cookie of [cookieMohamed, cookieCheikh]) {
        const treasury = (await send('get', '/api/v1/treasury/summary', cookie)).body.data
        const dashboard = (await send('get', '/api/v1/dashboard?period=all', cookie)).body.data
        const withdrawals = (await send('get', `${BASE}/summary`, cookie)).body.data
        expect([treasury.balance, dashboard.treasury.balance, withdrawals.treasury.balance]).toEqual([75000, 75000, 75000])
      }
    })

    it("l'historique de la Trésorerie contient le retrait, une seule fois, comme sortie", async () => {
      await fund(100000)
      const created = await createOk(cheikh, { amount: 12000, reason: 'Besoin' })
      const history = (await send('get', '/api/v1/treasury/movements?type=WITHDRAWAL', cookieCheikh)).body
      expect(history.data.movements).toHaveLength(1)
      expect(history.data.movements[0]).toMatchObject({ id: created.id, type: 'WITHDRAWAL', direction: 'OUT', amount: 12000 })
      const detail = await send('get', `/api/v1/treasury/movements/WITHDRAWAL/${created.id}`, cookieMohamed)
      expect(detail.status).toBe(200)
    })
  })

  describe('idempotence', () => {
    it('même clé et même requête : un seul retrait, la réponse est rejouée', async () => {
      await fund(100000)
      const key = newKey()
      const first = await post(payload(cheikh), cookieMohamed, key)
      const second = await post(payload(cheikh), cookieMohamed, key)
      expect(first.status).toBe(201)
      expect(second.status).toBe(201)
      expect(second.headers['idempotent-replayed']).toBe('true')
      expect(second.body.data.withdrawal.id).toBe(first.body.data.withdrawal.id)
      expect(await counts()).toEqual({ withdrawals: 1, audits: 1, keys: 1 })
      expect(await balance()).toBe(90000)
    })

    it('le rejeu reste un rejeu même si la trésorerie ne suffit plus (jamais « insuffisante »)', async () => {
      await fund(60000)
      const key = newKey()
      expect((await post(payload(cheikh, { amount: 60000 }), cookieMohamed, key)).status).toBe(201)
      const replay = await post(payload(cheikh, { amount: 60000 }), cookieMohamed, key)
      expect(replay.status).toBe(201)
      expect(replay.headers['idempotent-replayed']).toBe('true')
      expect(await counts()).toEqual({ withdrawals: 1, audits: 1, keys: 1 })
    })

    it('même clé avec une requête différente : 422, rien de plus écrit', async () => {
      await fund(100000)
      const key = newKey()
      await post(payload(cheikh), cookieMohamed, key)
      const res = await post(payload(cheikh, { amount: 20000 }), cookieMohamed, key)
      expect(res.status).toBe(422)
      expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED')
      expect(await counts()).toEqual({ withdrawals: 1, audits: 1, keys: 1 })
    })

    it('la même valeur de clé utilisée par l’autre associé ne collisionne pas', async () => {
      await fund(100000)
      const key = newKey()
      expect((await post(payload(cheikh), cookieMohamed, key)).status).toBe(201)
      expect((await post(payload(mohamed), cookieCheikh, key)).status).toBe(201)
      expect((await counts()).withdrawals).toBe(2)
    })

    it('deux requêtes simultanées avec la même clé : un seul retrait, aucun doublon', async () => {
      await fund(100000)
      const key = newKey()
      const results = await Promise.all([post(payload(cheikh), cookieMohamed, key), post(payload(cheikh), cookieMohamed, key), post(payload(cheikh), cookieMohamed, key)])
      expect(results.map((res) => res.status)).toEqual([201, 201, 201])
      expect(new Set(results.map((res) => res.body.data.withdrawal.id)).size).toBe(1)
      expect(await counts()).toEqual({ withdrawals: 1, audits: 1, keys: 1 })
      expect(await balance()).toBe(90000)
    })
  })

  describe('concurrence', () => {
    const fire = (count, amount) =>
      Promise.all(Array.from({ length: count }, (_, index) => post(payload(index % 2 ? mohamed : cheikh, { amount }), index % 2 ? cookieCheikh : cookieMohamed)))

    it('6 retraits simultanés de 60 000 FCFA pour 100 000 FCFA : un seul accepté, solde final 40 000', async () => {
      await fund(100000)
      const results = await fire(6, 60000)
      expect(results.filter((res) => res.status === 201)).toHaveLength(1)
      const refused = results.filter((res) => res.status === 409)
      expect(refused).toHaveLength(5)
      expect(refused.every((res) => res.body.error.code === 'INSUFFICIENT_TREASURY')).toBe(true)
      expect(await balance()).toBe(40000)
      expect(await counts()).toEqual({ withdrawals: 1, audits: 1, keys: 1 })
    })

    it('12 retraits simultanés de 10 000 FCFA pour 100 000 FCFA : dix acceptés, deux refusés, solde final 0', async () => {
      await fund(100000)
      const results = await fire(12, 10000)
      expect(results.filter((res) => res.status === 201)).toHaveLength(10)
      expect(results.filter((res) => res.status === 409)).toHaveLength(2)
      expect(await balance()).toBe(0)
      expect(await counts()).toEqual({ withdrawals: 10, audits: 10, keys: 10 })
    })

    it('retrait et modification simultanés ne peuvent pas dépenser deux fois le même argent', async () => {
      await fund(100000)
      const created = await createOk(cheikh, { amount: 50000 })
      const results = await Promise.all([
        post(payload(cheikh, { amount: 50000 }), cookieMohamed),
        send('patch', `${BASE}/${created.id}`, cookieCheikh, { amount: 100000 }),
      ])
      expect(results.filter((res) => res.status < 300)).toHaveLength(1)
      expect(await balance()).toBe(0)
    })
  })

  describe('audit et traçabilité', () => {
    it('création : un AuditLog avec le retrait, mêmes identifiants, auteur de la session', async () => {
      await fund(100000)
      const created = await createOk(cheikh, { amount: 15000, reason: 'Loyer' })
      const logs = await AuditLog.find({ resourceType: 'WITHDRAWAL' }).lean()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({ action: 'WITHDRAWAL_CREATED', actorName: 'Mohamed Bakhoum' })
      expect(String(logs[0].actor)).toBe(String(mohamed._id))
      expect(String(logs[0].resourceId)).toBe(created.id)
      expect(logs[0].occurredAt).toBeInstanceOf(Date)
      expect(logs[0].after).toEqual({ beneficiary: String(cheikh._id), recordedBy: String(mohamed._id), amount: 15000, withdrawalDate: '2026-12-18', reason: 'Loyer' })
    })

    it('refus (solde, validation, date) : aucun AuditLog isolé, autant de retraits que de journaux', async () => {
      await fund(10000)
      await post(payload(cheikh, { amount: 99999 }), cookieMohamed)
      await post(payload(cheikh, { amount: -1 }), cookieMohamed)
      await post(payload(cheikh, { withdrawalDate: '2026-12-25' }), cookieMohamed)
      expect((await counts()).audits).toBe(0)
      await createOk(cheikh, { amount: 5000 })
      const now = await counts()
      expect(now.audits).toBe(now.withdrawals)
    })

    it('modification : avant/après tracés ; suppression logique : tracée avec son motif', async () => {
      await fund(100000)
      const created = await createOk(cheikh, { amount: 10000, reason: 'Avant' })
      const patched = await send('patch', `${BASE}/${created.id}`, cookieCheikh, { amount: 12000, reason: 'Après', beneficiaryId: String(mohamed._id) })
      expect(patched.status).toBe(200)
      expect(patched.body.data.withdrawal).toMatchObject({ amount: 12000, reason: 'Après', beneficiary: { name: 'Mohamed Bakhoum' }, recordedBy: { name: 'Mohamed Bakhoum' } })
      const update = await AuditLog.findOne({ action: 'WITHDRAWAL_UPDATED' }).lean()
      expect(String(update.actor)).toBe(String(cheikh._id))
      expect(update.before).toMatchObject({ amount: 10000, reason: 'Avant', beneficiary: String(cheikh._id) })
      expect(update.after).toMatchObject({ amount: 12000, reason: 'Après', beneficiary: String(mohamed._id) })
      expect((await send('delete', `${BASE}/${created.id}`, cookieMohamed, { reason: 'Doublon' })).status).toBe(200)
      const removal = await AuditLog.findOne({ action: 'WITHDRAWAL_DELETED' }).lean()
      expect(String(removal.actor)).toBe(String(mohamed._id))
      expect(removal.before).toMatchObject({ amount: 12000 })
      expect(removal.after).toEqual({ deleted: true, deletionReason: 'Doublon' })
      expect(await AuditLog.countDocuments({ resourceType: 'WITHDRAWAL' })).toBe(3)
    })
  })

  describe('modification', () => {
    it("l'auteur d'enregistrement ne change jamais, même modifié par l'autre associé", async () => {
      await fund(100000)
      const created = await createOk(cheikh, {}, cookieMohamed)
      await send('patch', `${BASE}/${created.id}`, cookieCheikh, { reason: 'Modifié' })
      const stored = await Withdrawal.collection.findOne({})
      expect(String(stored.recordedBy)).toBe(String(mohamed._id))
      expect((await send('patch', `${BASE}/${created.id}`, cookieCheikh, { recordedBy: String(cheikh._id) })).status).toBe(400)
    })

    it('augmentation du montant : acceptée si elle tient dans le solde, sinon 409 et retrait inchangé', async () => {
      await fund(100000)
      const created = await createOk(cheikh, { amount: 40000 }) // solde 60 000
      const ok = await send('patch', `${BASE}/${created.id}`, cookieMohamed, { amount: 100000 }) // +60 000 = solde exact
      expect(ok.status).toBe(200)
      expect(await balance()).toBe(0)
      const refused = await send('patch', `${BASE}/${created.id}`, cookieMohamed, { amount: 100001 })
      expect(refused.status).toBe(409)
      expect(refused.body.error.code).toBe('INSUFFICIENT_TREASURY')
      expect((await Withdrawal.collection.findOne({})).amount).toBe(100000)
      expect(await AuditLog.countDocuments({ action: 'WITHDRAWAL_UPDATED' })).toBe(1)
    })

    it('baisse du montant, changement de date, de bénéficiaire et de motif : trésorerie recalculée', async () => {
      await fund(100000)
      const created = await createOk(cheikh, { amount: 40000 })
      const res = await send('patch', `${BASE}/${created.id}`, cookieMohamed, { amount: 10000, withdrawalDate: '2026-12-01', reason: null })
      expect(res.status).toBe(200)
      expect(res.body.data).toMatchObject({ changed: true, withdrawal: { amount: 10000, withdrawalDate: '2026-12-01', reason: null } })
      expect(await balance()).toBe(90000)
    })

    it('date future ou invalide refusée ; montant invalide refusé ; corps vide refusé', async () => {
      await fund(100000)
      const created = await createOk(cheikh)
      const future = await send('patch', `${BASE}/${created.id}`, cookieMohamed, { withdrawalDate: '2026-12-21' })
      expect(future.status).toBe(422)
      expect(future.body.error.code).toBe('OUTFLOW_DATE_IN_FUTURE')
      for (const body of [{ withdrawalDate: '2026-13-40' }, { amount: 0 }, { amount: 1.5 }, {}, { beneficiaryId: 'zzz' }]) {
        expect((await send('patch', `${BASE}/${created.id}`, cookieMohamed, body)).status).toBe(400)
      }
      expect((await Withdrawal.collection.findOne({})).withdrawalDate).toBe('2026-12-18')
    })

    it("bénéficiaire inexistant ou désactivé refusé ; retrait absent ou supprimé : 404", async () => {
      await fund(100000)
      const created = await createOk(cheikh)
      expect((await send('patch', `${BASE}/${created.id}`, cookieMohamed, { beneficiaryId: FAKE_ID })).status).toBe(404)
      expect((await send('patch', `${BASE}/${FAKE_ID}`, cookieMohamed, { amount: 5 })).status).toBe(404)
      expect((await send('patch', `${BASE}/pas-un-id`, cookieMohamed, { amount: 5 })).status).toBe(404)
      await send('delete', `${BASE}/${created.id}`, cookieMohamed)
      expect((await send('patch', `${BASE}/${created.id}`, cookieMohamed, { amount: 5 })).status).toBe(404)
    })

    it('modification sans changement réel : changed=false, aucun audit', async () => {
      await fund(100000)
      const created = await createOk(cheikh, { amount: 10000, reason: 'Loyer' })
      const res = await send('patch', `${BASE}/${created.id}`, cookieMohamed, { amount: 10000, reason: 'Loyer' })
      expect(res.status).toBe(200)
      expect(res.body.data.changed).toBe(false)
      expect(await AuditLog.countDocuments({ action: 'WITHDRAWAL_UPDATED' })).toBe(0)
    })
  })

  describe('suppression logique', () => {
    it('le document reste en base ; une seconde suppression : 404 ; le détail devient introuvable', async () => {
      await fund(100000)
      const created = await createOk(cheikh)
      const first = await send('delete', `${BASE}/${created.id}`, cookieMohamed)
      expect(first.status).toBe(200)
      expect(first.body.data).toEqual({ id: created.id, deleted: true })
      expect(await Withdrawal.collection.countDocuments()).toBe(1)
      expect((await send('delete', `${BASE}/${created.id}`, cookieMohamed)).status).toBe(404)
      expect((await send('get', `${BASE}/${created.id}`, cookieMohamed)).status).toBe(404)
      expect((await send('delete', `${BASE}/${FAKE_ID}`, cookieMohamed)).status).toBe(404)
    })

    it('motif de suppression trop long refusé (400), retrait conservé', async () => {
      await fund(100000)
      const created = await createOk(cheikh)
      expect((await send('delete', `${BASE}/${created.id}`, cookieMohamed, { reason: 'x'.repeat(301) })).status).toBe(400)
      expect((await send('get', `${BASE}/${created.id}`, cookieMohamed)).status).toBe(200)
    })

    it('la suppression physique est impossible via le modèle', async () => {
      await fund(100000)
      await createOk(cheikh)
      await expect(Withdrawal.deleteMany({})).rejects.toMatchObject({ code: 'PHYSICAL_DELETE_FORBIDDEN' })
      expect(await Withdrawal.collection.countDocuments()).toBe(1)
    })
  })

  describe('consultation', () => {
    async function seed() {
      await fund(500000)
      const make = (beneficiary, amount, withdrawalDate, reason, cookie) => createOk(beneficiary, { amount, withdrawalDate, reason }, cookie)
      return {
        a: await make(cheikh, 10000, '2026-12-01', 'Loyer', cookieMohamed),
        b: await make(mohamed, 25000, '2026-12-05', 'Médicaments', cookieCheikh),
        c: await make(mohamed, 5000, '2026-12-05', undefined, cookieMohamed),
        d: await make(cheikh, 40000, '2026-12-10', 'Équipement', cookieCheikh),
      }
    }
    const list = async (query = '') => (await send('get', `${BASE}${query}`, cookieMohamed)).body
    const idsOf = (body) => body.data.withdrawals.map((item) => item.id)

    it('liste par défaut : plus récents d’abord, méta de pagination, total filtré', async () => {
      const { a, b, c, d } = await seed()
      const body = await list()
      expect(idsOf(body)).toEqual([d.id, c.id, b.id, a.id])
      expect(body.meta).toEqual({ page: 1, pageSize: 20, total: 4, totalPages: 1, filteredAmount: 80000 })
    })

    it('tri par montant et par date, croissant et décroissant', async () => {
      const { a, b, c, d } = await seed()
      expect(idsOf(await list('?sort=amount_desc'))).toEqual([d.id, b.id, a.id, c.id])
      expect(idsOf(await list('?sort=amount_asc'))).toEqual([c.id, a.id, b.id, d.id])
      expect(idsOf(await list('?sort=date_asc'))).toEqual([a.id, c.id, b.id, d.id])
    })

    it('filtres bénéficiaire, auteur, période et recherche sans accent', async () => {
      const { a, b, c, d } = await seed()
      expect(idsOf(await list(`?beneficiaryId=${mohamed._id}`))).toEqual([c.id, b.id])
      expect(idsOf(await list(`?authorId=${cheikh._id}`))).toEqual([d.id, b.id])
      expect(idsOf(await list('?from=2026-12-05&to=2026-12-05'))).toEqual([c.id, b.id])
      expect(idsOf(await list('?search=medicaments'))).toEqual([b.id])
      expect(idsOf(await list('?search=equipement'))).toEqual([d.id])
      expect(idsOf(await list('?search=loyer&sort=date_asc'))).toEqual([a.id])
      expect(idsOf(await list('?search=introuvable'))).toEqual([])
    })

    it('pagination : pages, taille, dernière page, paramètres invalides refusés (400)', async () => {
      const { a, b } = await seed()
      const page1 = await list('?pageSize=3')
      expect(page1.meta).toMatchObject({ page: 1, total: 4, totalPages: 2 })
      expect(page1.data.withdrawals).toHaveLength(3)
      const page2 = await list('?pageSize=3&page=2')
      expect(idsOf(page2)).toEqual([a.id])
      expect(idsOf(await list('?pageSize=2&page=2'))).toEqual([b.id, a.id])
      for (const bad of ['?pageSize=500', '?page=0', '?sort=nimporte', '?beneficiaryId=x', '?from=2026-12-10&to=2026-12-01', '?inconnu=1']) {
        expect((await send('get', `${BASE}${bad}`, cookieMohamed)).status).toBe(400)
      }
    })

    it('détail : informations complètes ; 404 inexistant ; identifiant invalide : 404', async () => {
      const { b } = await seed()
      const res = await send('get', `${BASE}/${b.id}`, cookieCheikh)
      expect(res.status).toBe(200)
      expect(res.body.data.withdrawal).toMatchObject({
        id: b.id, amount: 25000, withdrawalDate: '2026-12-05', reason: 'Médicaments',
        beneficiary: { name: 'Mohamed Bakhoum' }, recordedBy: { name: 'Cheikh Sow' },
      })
      expect(res.body.data.withdrawal.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect((await send('get', `${BASE}/${FAKE_ID}`, cookieMohamed)).status).toBe(404)
      expect((await send('get', `${BASE}/pas-un-id`, cookieMohamed)).status).toBe(404)
    })

    it('indicateurs : nombre, total, total par bénéficiaire, derniers retraits, solde', async () => {
      const { d } = await seed()
      const summary = (await send('get', `${BASE}/summary`, cookieCheikh)).body.data
      expect(summary).toMatchObject({ count: 4, totalAmount: 80000, currency: 'XOF' })
      expect(summary.byBeneficiary.map((row) => [row.partner.name, row.amount, row.count])).toEqual([['Mohamed Bakhoum', 30000, 2], ['Cheikh Sow', 50000, 2]])
      expect(summary.latest[0].id).toBe(d.id)
      expect(summary.treasury.balance).toBe(420000)
      expect(summary.partners.map((p) => p.partnerNumber)).toEqual([1, 2])
    })

    it('aucun retrait : zéros, liste vide, jamais de donnée inventée', async () => {
      const summary = (await send('get', `${BASE}/summary`, cookieMohamed)).body.data
      expect([summary.count, summary.totalAmount, summary.latest.length, summary.treasury.balance]).toEqual([0, 0, 0, 0])
      const body = await list()
      expect(body.data.withdrawals).toEqual([])
      expect(body.meta.total).toBe(0)
    })
  })

  describe('non-régression', () => {
    it('cotisations et trésorerie restent opérationnelles ; aucune route de retrait supplémentaire', async () => {
      expect((await send('get', '/api/v1/contributions', cookieMohamed)).status).toBe(200)
      expect((await send('get', '/api/v1/treasury/summary', cookieMohamed)).status).toBe(200)
      expect((await send('put', BASE, cookieMohamed, {})).status).toBe(404)
      expect((await send('put', `${BASE}/${FAKE_ID}`, cookieMohamed, {})).status).toBe(404)
    })
  })
})
