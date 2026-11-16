// Horloge métier fixée au 20 décembre 2026. Les enregistrements financiers sont insérés dans la base de test uniquement.
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { AuditLog } from '../../src/models/AuditLog.js'
import { Business } from '../../src/models/Business.js'
import { BusinessOperation } from '../../src/models/BusinessOperation.js'
import { Contribution } from '../../src/models/Contribution.js'
import { IdempotencyKey } from '../../src/models/IdempotencyKey.js'
import { Session } from '../../src/models/Session.js'
import { TreasuryLock } from '../../src/models/TreasuryLock.js'
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
const BASE = '/api/v1/history'
const FAKE_ID = '507f1f77bcf86cd799439011'

describe.skipIf(!testDatabaseUrl())('API /api/v1/history (base de test)', () => {
  const { database } = useTestDatabase()
  let app
  let mohamed
  let cheikh
  let wax
  let soap
  let cookieMohamed
  let cookieCheikh

  beforeAll(async () => {
    await Promise.all([Business, BusinessOperation, Contribution, Withdrawal, IdempotencyKey, TreasuryLock, AuditLog].map((model) => model.init()))
    app = createApp({ config, logger, database, clock })
  })

  beforeEach(async () => {
    ;({ user: mohamed } = await createTestUser({ partnerNumber: 1, name: 'Mohamed Bakhoum', email: 'mohamed@example.com' }))
    ;({ user: cheikh } = await createTestUser({ partnerNumber: 2, name: 'Cheikh Sow', email: 'cheikh@example.com' }))
    const now = new Date()
    const business = (name, category) => Business.collection.insertOne({ name, category, status: 'ACTIVE', startDate: '2026-12-01', description: '', createdBy: mohamed._id, createdAt: now, updatedAt: now })
    wax = (await business('Pagnes Wax', 'Textile')).insertedId
    soap = (await business('Savon Noir', 'Cosmétique')).insertedId
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
  const get = (path, cookie = cookieMohamed) => send('get', path, cookie)

  const base = () => ({ deletedAt: null, createdAt: new Date(), updatedAt: new Date() })
  const addContribution = async (partner, amount, contributionDate, extra = {}) =>
    (await Contribution.collection.insertOne({ partner: partner._id, amount, contributionDate, period: contributionDate.slice(0, 7), note: null, recordedBy: partner._id, ...base(), ...extra })).insertedId
  const addOperation = async (business, type, amount, operationDate, extra = {}) =>
    (await BusinessOperation.collection.insertOne({ business, type, amount, operationDate, description: `${type} test`, concernedPartner: null, recordedBy: mohamed._id, receipt: null, ...base(), ...extra })).insertedId
  const addWithdrawal = async (amount, withdrawalDate, extra = {}) =>
    (await Withdrawal.collection.insertOne({ beneficiary: cheikh._id, amount, withdrawalDate, reason: 'Besoin personnel', recordedBy: cheikh._id, ...base(), ...extra })).insertedId

  /** Jeu de référence : entrées 90 000, sorties 45 000, solde net 45 000, 6 opérations comptées. */
  async function seedReference() {
    const ids = {}
    ids.c1 = await addContribution(mohamed, 40000, '2026-12-05')
    ids.c2 = await addContribution(cheikh, 30000, '2026-12-06')
    ids.i1 = await addOperation(wax, 'INVESTMENT', 30000, '2026-12-10', { description: 'Achat de tissus', concernedPartner: mohamed._id, receipt: { reference: 'FAC-1', url: 'https://exemple.sn/f1' } })
    ids.e1 = await addOperation(wax, 'EXPENSE', 5000, '2026-12-12', { description: 'Transport' })
    ids.r1 = await addOperation(soap, 'REVENUE', 20000, '2026-12-15', { description: 'Vente de savons', concernedPartner: cheikh._id })
    ids.w1 = await addWithdrawal(10000, '2026-12-18')
    ids.future = await addContribution(mohamed, 15000, '2027-01-05')
    await addContribution(mohamed, 99999, '2026-12-07', { deletedAt: new Date(), deletedBy: mohamed._id })
    await addOperation(wax, 'EXPENSE', 88888, '2026-12-08', { deletedAt: new Date(), deletedBy: mohamed._id })
    ids.deletedW = await addWithdrawal(77777, '2026-12-09', { deletedAt: new Date(), deletedBy: mohamed._id })
    return ids
  }
  const snapshot = async () => ({
    contributions: await Contribution.collection.find({}).toArray(),
    operations: await BusinessOperation.collection.find({}).toArray(),
    withdrawals: await Withdrawal.collection.find({}).toArray(),
    audits: await AuditLog.collection.countDocuments(),
  })

  describe('protection', () => {
    it('refuse tout sans authentification (401)', async () => {
      for (const path of [`${BASE}/summary`, BASE, `${BASE}/WITHDRAWAL/${FAKE_ID}`]) expect((await send('get', path)).status).toBe(401)
    })

    it('refuse une session révoquée', async () => {
      await Session.updateMany({ user: mohamed._id }, { $set: { revokedAt: new Date(), revokedReason: 'LOGOUT' } })
      expect((await get(BASE)).status).toBe(401)
    })

    it('Mohamed et Cheikh obtiennent exactement le même historique et les mêmes totaux', async () => {
      await seedReference()
      for (const path of [`${BASE}/summary`, BASE, `${BASE}?type=EXPENSE&sort=amount_asc`]) {
        const a = await get(path, cookieMohamed)
        const b = await get(path, cookieCheikh)
        expect(a.status).toBe(200)
        expect(b.status).toBe(200)
        const strip = (body) => ({ ...body, data: { ...body.data, generatedAt: undefined } })
        expect(strip(a.body)).toEqual(strip(b.body))
      }
    })
  })

  describe('lecture seule', () => {
    it('aucune écriture possible : 404 sur POST, PUT, PATCH, DELETE ; aucune donnée modifiée', async () => {
      const ids = await seedReference()
      const before = await snapshot()
      for (const method of ['post', 'put', 'patch', 'delete']) {
        for (const path of [BASE, `${BASE}/summary`, `${BASE}/WITHDRAWAL/${ids.w1}`]) {
          expect((await send(method, path, cookieMohamed, {})).status).toBe(404)
        }
      }
      expect(await snapshot()).toEqual(before)
    })

    it('consulter l’historique ne modifie rien (aucun enregistrement, aucun AuditLog)', async () => {
      const ids = await seedReference()
      const before = await snapshot()
      await get(`${BASE}/summary`)
      await get(BASE)
      await get(`${BASE}/CONTRIBUTION/${ids.c1}`)
      expect(await snapshot()).toEqual(before)
    })
  })

  describe('synthèse', () => {
    it('totaux par type, entrées, sorties, solde net et nombre d’opérations', async () => {
      await seedReference()
      const { totals, asOf } = (await get(`${BASE}/summary`)).body.data
      expect(asOf).toBe('2026-12-20')
      expect(totals.contributions).toEqual({ amount: 70000, count: 2 })
      expect(totals.revenues).toEqual({ amount: 20000, count: 1 })
      expect(totals.investments).toEqual({ amount: 30000, count: 1 })
      expect(totals.expenses).toEqual({ amount: 5000, count: 1 })
      expect(totals.withdrawals).toEqual({ amount: 10000, count: 1 })
      expect(totals.inflow).toBe(90000)
      expect(totals.outflow).toBe(45000)
      expect(totals.net).toBe(45000)
      expect(totals.operationsCount).toBe(6)
    })

    it('opérations futures et supprimées exclues des totaux ; le futur est signalé', async () => {
      await seedReference()
      const summary = (await get(`${BASE}/summary`)).body.data
      expect(summary.totals.contributions.amount).toBe(70000) // ni 15 000 futurs ni 99 999 supprimés
      expect(summary.totals.expenses.amount).toBe(5000)
      expect(summary.totals.withdrawals.amount).toBe(10000)
      expect(summary.futureIgnored).toMatchObject({ count: 1, amount: 15000 })
      expect(summary.notices.map((notice) => notice.code)).toContain('FUTURE_OPERATIONS_IGNORED')
    })

    it('pas de double comptabilisation : le résultat commercial n’est pas ajouté aux entrées, chaque opération compte une fois', async () => {
      await seedReference()
      const summary = (await get(`${BASE}/summary`)).body.data
      expect(summary.commercialResult).toMatchObject({ revenues: 20000, expenses: 5000, amount: 15000, kind: 'PROFIT' })
      expect(summary.totals.inflow).toBe(summary.totals.contributions.amount + summary.totals.revenues.amount)
      expect(summary.totals.outflow).toBe(summary.totals.investments.amount + summary.totals.expenses.amount + summary.totals.withdrawals.amount)
      expect(summary.totals.net).toBe(summary.totals.inflow - summary.totals.outflow)
      const list = (await get(`${BASE}?limit=100`)).body
      expect(list.meta.total).toBe(summary.totals.operationsCount)
      expect(new Set(list.data.operations.map((operation) => `${operation.type}:${operation.id}`)).size).toBe(list.meta.total)
      expect(list.data.operations.some((operation) => operation.type === 'PROFIT')).toBe(false)
    })

    it('cohérence avec la Trésorerie et le Dashboard', async () => {
      await seedReference()
      const history = (await get(`${BASE}/summary`)).body.data
      const treasury = (await get('/api/v1/treasury/summary')).body.data
      const dashboard = (await get('/api/v1/dashboard?period=all')).body.data
      expect(history.totals.net).toBe(treasury.balance)
      expect(history.totals.net).toBe(dashboard.treasury.balance)
      expect(history.totals.inflow).toBe(dashboard.overview.inflow)
      expect(history.totals.outflow).toBe(dashboard.overview.outflow)
      expect(history.totals.operationsCount).toBe(treasury.movementsCount)
      expect(history.commercialResult.amount).toBe(dashboard.result.amount)
    })

    it('annuaires pour les filtres : associés et activités ; base vide : zéros, rien d’inventé', async () => {
      const empty = (await get(`${BASE}/summary`)).body.data
      expect(empty.totals.operationsCount).toBe(0)
      expect([empty.totals.inflow, empty.totals.outflow, empty.totals.net]).toEqual([0, 0, 0])
      expect(empty.lastOperationDate).toBeNull()
      expect(empty.partners.map((partner) => partner.partnerNumber)).toEqual([1, 2])
      expect(empty.activities.map((activity) => activity.name)).toEqual(['Pagnes Wax', 'Savon Noir'])
      expect((await get(BASE)).body).toMatchObject({ data: { operations: [] }, meta: { total: 0, totalPages: 1, page: 1, limit: 20 } })
    })
  })

  describe('consultation', () => {
    const idsOf = (res) => res.body.data.operations.map((operation) => operation.id)

    it('liste par défaut : opérations comptées seulement, plus récentes d’abord, méta page/limit/total/totalPages', async () => {
      const ids = await seedReference()
      const res = await get(BASE)
      expect(res.status).toBe(200)
      expect(idsOf(res)).toEqual([ids.w1, ids.r1, ids.e1, ids.i1, ids.c2, ids.c1].map(String))
      expect(res.body.meta).toMatchObject({ page: 1, limit: 20, total: 6, totalPages: 1, filtered: { count: 6, inflow: 90000, outflow: 45000, net: 45000 } })
      const operation = res.body.data.operations[0]
      expect(operation).toMatchObject({ type: 'WITHDRAWAL', direction: 'OUT', amount: 10000, countedInBalance: true, partner: { name: 'Cheikh Sow' }, recordedBy: { name: 'Cheikh Sow' } })
      expect(JSON.stringify(res.body)).not.toContain('@example.com')
    })

    it('tri par date et par montant, croissant et décroissant', async () => {
      const ids = await seedReference()
      expect(idsOf(await get(`${BASE}?sort=date_asc`))).toEqual([ids.c1, ids.c2, ids.i1, ids.e1, ids.r1, ids.w1].map(String))
      expect(idsOf(await get(`${BASE}?sort=amount_desc`))).toEqual([ids.c1, ids.i1, ids.c2, ids.r1, ids.w1, ids.e1].map(String)) // à montant égal : plus récent d'abord
      expect(idsOf(await get(`${BASE}?sort=amount_asc`))).toEqual([ids.e1, ids.w1, ids.r1, ids.i1, ids.c2, ids.c1].map(String))
    })

    it('filtres : type, direction, associé, activité, « sans activité »', async () => {
      const ids = await seedReference()
      expect(idsOf(await get(`${BASE}?type=EXPENSE`))).toEqual([String(ids.e1)])
      expect(idsOf(await get(`${BASE}?direction=IN`))).toEqual([ids.r1, ids.c2, ids.c1].map(String))
      expect(idsOf(await get(`${BASE}?direction=OUT`))).toEqual([ids.w1, ids.e1, ids.i1].map(String))
      expect(idsOf(await get(`${BASE}?partnerId=${cheikh._id}`))).toEqual([ids.w1, ids.r1, ids.c2].map(String))
      expect(idsOf(await get(`${BASE}?activityId=${wax}`))).toEqual([ids.e1, ids.i1].map(String))
      expect(idsOf(await get(`${BASE}?activityId=${soap}`))).toEqual([String(ids.r1)])
      expect(idsOf(await get(`${BASE}?activityId=none`))).toEqual([ids.w1, ids.c2, ids.c1].map(String))
    })

    it('période : prédéfinie, personnalisée, bornes incluses', async () => {
      const ids = await seedReference()
      expect(idsOf(await get(`${BASE}?period=today`))).toEqual([])
      expect(idsOf(await get(`${BASE}?period=week`))).toEqual([ids.w1, ids.r1].map(String)) // semaine du 14 au 20 décembre
      expect((await get(`${BASE}?period=month`)).body.meta.total).toBe(6)
      expect(idsOf(await get(`${BASE}?period=custom&from=2026-12-10&to=2026-12-12`))).toEqual([ids.e1, ids.i1].map(String))
      expect(idsOf(await get(`${BASE}?from=2026-12-15`))).toEqual([ids.w1, ids.r1].map(String))
      expect(idsOf(await get(`${BASE}?to=2026-12-05`))).toEqual([String(ids.c1)])
    })

    it('filtres combinés', async () => {
      const ids = await seedReference()
      expect(idsOf(await get(`${BASE}?direction=OUT&activityId=${wax}&from=2026-12-11&sort=amount_desc`))).toEqual([String(ids.e1)])
      expect(idsOf(await get(`${BASE}?direction=IN&partnerId=${cheikh._id}&period=month`))).toEqual([ids.r1, ids.c2].map(String))
      expect(idsOf(await get(`${BASE}?type=CONTRIBUTION&partnerId=${mohamed._id}`))).toEqual([String(ids.c1)])
      expect(idsOf(await get(`${BASE}?type=REVENUE&partnerId=${mohamed._id}`))).toEqual([])
    })

    it('recherche sans accent ni casse : description, type, associé, activité', async () => {
      const ids = await seedReference()
      expect(idsOf(await get(`${BASE}?search=tissus`))).toEqual([String(ids.i1)])
      expect(idsOf(await get(`${BASE}?search=RETRAIT`))).toEqual([String(ids.w1)])
      expect(idsOf(await get(`${BASE}?search=savon`))).toEqual([String(ids.r1)])
      expect(idsOf(await get(`${BASE}?search=cosmetique`))).toEqual([String(ids.r1)])
      expect(idsOf(await get(`${BASE}?search=mohamed`)).length).toBeGreaterThan(0)
      expect(idsOf(await get(`${BASE}?search=introuvable`))).toEqual([])
      expect(idsOf(await get(`${BASE}?search=transport&type=INVESTMENT`))).toEqual([])
    })

    it('pagination serveur : limit, page, dernière page, totaux du filtre sur tout l’ensemble', async () => {
      const ids = await seedReference()
      const first = await get(`${BASE}?limit=4&sort=date_asc`)
      expect(first.body.meta).toMatchObject({ page: 1, limit: 4, total: 6, totalPages: 2 })
      expect(idsOf(first)).toEqual([ids.c1, ids.c2, ids.i1, ids.e1].map(String))
      expect(first.body.meta.filtered).toMatchObject({ count: 6, inflow: 90000, outflow: 45000 })
      const second = await get(`${BASE}?limit=4&page=2&sort=date_asc`)
      expect(idsOf(second)).toEqual([ids.r1, ids.w1].map(String))
      expect((await get(`${BASE}?limit=4&page=9&sort=date_asc`)).body.meta.page).toBe(2)
    })

    it('paramètres invalides refusés (400)', async () => {
      for (const bad of ['?type=AUTRE', '?direction=X', '?partnerId=abc', '?activityId=abc', '?period=decade', '?period=custom', '?from=2026-02-30', '?from=2026-12-10&to=2026-12-01', '?sort=x', '?page=0', '?limit=101', '?pageSize=20', '?inconnu=1']) {
        const res = await get(`${BASE}${bad}`)
        expect(res.status).toBe(400)
        expect(res.body.error.code).toBe('VALIDATION_ERROR')
      }
    })
  })

  describe('détail', () => {
    it('chaque type : informations de l’enregistrement d’origine, rien d’inventé', async () => {
      const ids = await seedReference()
      const detail = async (type, id) => (await get(`${BASE}/${type}/${id}`)).body.data.operation
      expect(await detail('CONTRIBUTION', ids.c1)).toMatchObject({ id: String(ids.c1), type: 'CONTRIBUTION', direction: 'IN', amount: 40000, details: { period: '2026-12' }, origin: { collection: 'contributions' }, recordedBy: { name: 'Mohamed Bakhoum' } })
      expect(await detail('INVESTMENT', ids.i1)).toMatchObject({ amount: 30000, activity: { name: 'Pagnes Wax' }, partner: { name: 'Mohamed Bakhoum' }, details: { receipt: { reference: 'FAC-1' } } })
      expect(await detail('EXPENSE', ids.e1)).toMatchObject({ direction: 'OUT', description: 'Transport' })
      expect(await detail('REVENUE', ids.r1)).toMatchObject({ direction: 'IN', activity: { name: 'Savon Noir' } })
      expect(await detail('WITHDRAWAL', ids.w1)).toMatchObject({ direction: 'OUT', details: { reason: 'Besoin personnel' }, signedAmount: -10000 })
    })

    it('opération future : consultable mais signalée comme non comptabilisée', async () => {
      const ids = await seedReference()
      const res = await get(`${BASE}/CONTRIBUTION/${ids.future}`)
      expect(res.status).toBe(200)
      expect(res.body.data.operation.countedInBalance).toBe(false)
    })

    it('identifiant invalide : 400 ; type inconnu : 400 ; opération inexistante, supprimée ou de mauvais type : 404 ; non authentifié : 401', async () => {
      const ids = await seedReference()
      expect((await get(`${BASE}/WITHDRAWAL/pas-un-id`)).status).toBe(400)
      const unknown = await get(`${BASE}/PROFIT/${ids.w1}`)
      expect(unknown.status).toBe(400)
      expect(unknown.body.error.code).toBe('INVALID_OPERATION_TYPE')
      expect((await get(`${BASE}/WITHDRAWAL/${FAKE_ID}`)).status).toBe(404)
      expect((await get(`${BASE}/WITHDRAWAL/${ids.deletedW}`)).status).toBe(404)
      expect((await get(`${BASE}/EXPENSE/${ids.w1}`)).status).toBe(404)
      expect((await send('get', `${BASE}/WITHDRAWAL/${ids.w1}`)).status).toBe(401)
    })
  })

  describe('modules existants', () => {
    it('un retrait enregistré par le module Retraits apparaît dans l’historique, une seule fois, et le solde net baisse', async () => {
      await addContribution(mohamed, 100000, '2026-12-05')
      const res = await send('post', '/api/v1/withdrawals', cookieMohamed, { beneficiaryId: String(cheikh._id), amount: 30000, withdrawalDate: '2026-12-19', reason: 'Loyer' }).set('Idempotency-Key', 'history-key-0001')
      expect(res.status).toBe(201)
      const list = (await get(`${BASE}?type=WITHDRAWAL`)).body
      expect(list.data.operations).toHaveLength(1)
      expect(list.data.operations[0]).toMatchObject({ id: res.body.data.withdrawal.id, amount: 30000, partner: { name: 'Cheikh Sow' }, recordedBy: { name: 'Mohamed Bakhoum' } })
      expect((await get(`${BASE}/summary`)).body.data.totals.net).toBe(70000)
    })
  })
})
