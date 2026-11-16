// Horloge métier fixée au 20 décembre 2026. Les opérations financières sont insérées dans la base de test uniquement.
import mongoose from 'mongoose'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { AuditLog } from '../../src/models/AuditLog.js'
import { Business } from '../../src/models/Business.js'
import { BusinessOperation } from '../../src/models/BusinessOperation.js'
import { Session } from '../../src/models/Session.js'
import { createLogger } from '../../src/utils/logger.js'
import { TEST_PASSWORD, cookieHeader, createTestUser, readSetCookie, testDatabaseUrl, useTestDatabase } from '../helpers/authFixtures.js'
import { FRONTEND_ORIGIN, buildTestConfig, withAuth } from '../helpers/testConfig.js'

const logger = createLogger({ level: 'silent', environment: 'test' })
const config = withAuth(buildTestConfig({ FUND_START_PERIOD: '2026-12' }), {
  loginRateLimit: { windowMs: 60_000, max: 1000 },
  sensitiveActionRateLimit: { windowMs: 60_000, max: 1000 },
})
const clock = () => new Date('2026-12-20T10:00:00.000Z')
const BASE = '/api/v1/activities'
const FAKE_ID = '507f1f77bcf86cd799439011'

describe.skipIf(!testDatabaseUrl())('API /api/v1/activities (base de test)', () => {
  const { database } = useTestDatabase()
  let app
  let mohamed
  let cheikh

  beforeAll(async () => {
    await Promise.all([Business, BusinessOperation].map((model) => model.init()))
    app = createApp({ config, logger, database, clock })
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
  const send = (method, path, cookie, body) => {
    let req = request(app)[method](path).set('Origin', FRONTEND_ORIGIN)
    if (cookie) req = req.set('Cookie', cookie)
    return body === undefined ? req : req.send(body)
  }
  const create = async (cookie, overrides = {}) => {
    const res = await send('post', BASE, cookie, { name: 'Vente de pagnes', description: 'Wax', category: 'Textile', startDate: '2026-12-10', ...overrides })
    expect(res.status).toBe(201)
    return res.body.data.activity
  }
  const addOperations = async (activityId, rows = [['INVESTMENT', 50000, '2026-12-11'], ['EXPENSE', 3000, '2026-12-12'], ['REVENUE', 20000, '2026-12-15']]) => {
    await BusinessOperation.collection.insertMany(
      rows.map(([type, amount, operationDate]) => ({ business: new mongoose.Types.ObjectId(activityId), type, amount, operationDate, description: type, deletedAt: null, createdAt: new Date(), recordedBy: mohamed._id })),
    )
  }
  const operationsSnapshot = async () => (await BusinessOperation.collection.find({}).sort({ _id: 1 }).toArray()).map((row) => [String(row.business), row.type, row.amount, row.operationDate, row.deletedAt])

  describe('protection', () => {
    it('refuse tout sans authentification (401)', async () => {
      const calls = [['get', BASE], ['post', BASE], ['get', `${BASE}/${FAKE_ID}`], ['patch', `${BASE}/${FAKE_ID}`], ['post', `${BASE}/${FAKE_ID}/archive`]]
      for (const [method, path] of calls) expect((await send(method, path, null, method === 'get' ? undefined : {})).status).toBe(401)
      expect(await Business.countDocuments()).toBe(0)
    })

    it('refuse une session révoquée', async () => {
      const cookie = await session(mohamed)
      await Session.updateMany({ user: mohamed._id }, { $set: { revokedAt: new Date(), revokedReason: 'LOGOUT' } })
      expect((await send('get', BASE, cookie)).status).toBe(401)
      expect((await send('post', BASE, cookie, { name: 'X Y', startDate: '2026-12-10' })).status).toBe(401)
      expect(await Business.countDocuments()).toBe(0)
    })

    it('aucune route de suppression : DELETE introuvable, suppression physique interdite par le modèle', async () => {
      const cookie = await session(mohamed)
      const activity = await create(cookie)
      expect((await send('delete', `${BASE}/${activity.id}`, cookie)).status).toBe(404)
      await expect(Business.deleteOne({ _id: activity.id })).rejects.toMatchObject({ code: 'BUSINESS_DELETE_FORBIDDEN' })
      expect(await Business.countDocuments()).toBe(1)
    })
  })

  describe('création', () => {
    it('crée une activité active, auteur issu de la session, audit écrit, aucune donnée sensible', async () => {
      const cookie = await session(mohamed)
      const res = await send('post', BASE, cookie, { name: '  Vente de pagnes ', description: 'Wax', category: ' Textile ', startDate: '2026-12-10' })
      expect(res.status).toBe(201)
      const { activity } = res.body.data
      expect(activity).toMatchObject({ name: 'Vente de pagnes', category: 'Textile', status: 'ACTIVE', startDate: '2026-12-10', endDate: null, operationsCount: 0 })
      expect(activity.createdBy.name).toBe('Mohamed Bakhoum')
      expect(activity.allowedActions).toEqual(['edit', 'suspend', 'complete', 'archive'])
      for (const forbidden of ['passwordHash', '$argon2', 'email', 'refreshTokenHash']) expect(res.text).not.toContain(forbidden)

      const stored = await Business.findById(activity.id)
      expect(String(stored.createdBy)).toBe(String(mohamed._id))
      const audit = await AuditLog.find({ action: 'BUSINESS_CREATED' })
      expect(audit).toHaveLength(1)
      expect(String(audit[0].resourceId)).toBe(activity.id)
    })

    it.each([
      ['nom manquant', { name: undefined }],
      ['nom trop court', { name: 'A' }],
      ['date invalide', { startDate: '2026-02-30' }],
      ['fin avant le début', { endDate: '2026-12-01' }],
      ['statut interdit', { status: 'ARCHIVED' }],
      ['champ interdit', { createdBy: 'a'.repeat(24) }],
      ['champ financier', { totalInvested: 5000 }],
    ])('refuse : %s (400)', async (_label, overrides) => {
      const cookie = await session(mohamed)
      const res = await send('post', BASE, cookie, { name: 'Vente de pagnes', startDate: '2026-12-10', ...overrides })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(await Business.countDocuments()).toBe(0)
    })

    it('refuse un nom déjà utilisé (sans tenir compte de la casse ni des accents)', async () => {
      const cookie = await session(mohamed)
      await create(cookie, { name: 'Café du matin' })
      const res = await send('post', BASE, cookie, { name: 'CAFE DU MATIN', startDate: '2026-12-11' })
      expect([res.status, res.body.error.code]).toEqual([409, 'ACTIVITY_NAME_ALREADY_USED'])
      expect(await Business.countDocuments()).toBe(1)
    })
  })

  describe('consultation et liste', () => {
    it('détail : informations, historique et totaux financiers en lecture seule', async () => {
      const cookie = await session(cheikh)
      const activity = await create(cookie)
      await addOperations(activity.id)
      const res = await send('get', `${BASE}/${activity.id}`, cookie)
      expect(res.status).toBe(200)
      expect(res.body.data.activity).toMatchObject({ id: activity.id, operationsCount: 3, createdBy: { name: 'Cheikh Sow' } })
      expect(res.body.data.activity.financials).toEqual({
        investments: { amount: 50000, count: 1 },
        expenses: { amount: 3000, count: 1 },
        revenues: { amount: 20000, count: 1 },
        result: 17000,
      })
    })

    it('404 pour une activité inexistante, 400 pour un identifiant invalide', async () => {
      const cookie = await session(mohamed)
      const missing = await send('get', `${BASE}/${FAKE_ID}`, cookie)
      expect([missing.status, missing.body.error.code]).toEqual([404, 'ACTIVITY_NOT_FOUND'])
      const invalid = await send('get', `${BASE}/pas-un-id`, cookie)
      expect([invalid.status, invalid.body.error.code]).toEqual([400, 'INVALID_ID'])
      expect((await send('patch', `${BASE}/abc`, cookie, { name: 'Autre nom' })).status).toBe(400)
      expect((await send('post', `${BASE}/abc/suspend`, cookie, {})).status).toBe(400)
    })

    it('liste vide : 200 avec zéro activité et compteurs à zéro (aucune activité inventée)', async () => {
      const res = await send('get', BASE, await session(mohamed))
      expect(res.status).toBe(200)
      expect(res.body.data.activities).toEqual([])
      expect(res.body.meta).toMatchObject({ total: 0, counts: { total: 0, ACTIVE: 0, SUSPENDED: 0, COMPLETED: 0, ARCHIVED: 0 }, categories: [] })
    })

    it('recherche (sans accents ni casse), filtres statut et catégorie, tri, pagination, compteurs', async () => {
      const cookie = await session(mohamed)
      const cafe = await create(cookie, { name: 'Café Touba', category: 'Alimentation', startDate: '2026-12-02' })
      const pagnes = await create(cookie, { name: 'Pagnes', category: 'Textile', startDate: '2026-12-05' })
      const phones = await create(cookie, { name: 'Téléphones', category: 'Électronique', startDate: '2026-12-08' })
      await send('post', `${BASE}/${pagnes.id}/suspend`, cookie, {})
      await send('post', `${BASE}/${phones.id}/archive`, cookie, {})

      const names = async (query) => (await send('get', `${BASE}?${query}`, cookie)).body.data.activities.map((item) => item.name)
      expect(await names('search=cafe')).toEqual(['Café Touba'])
      expect(await names('search=PAGN')).toEqual(['Pagnes'])
      expect(await names('search=zzz')).toEqual([])
      expect(await names('')).toEqual(['Pagnes', 'Café Touba']) // archivées masquées, tri par démarrage décroissant
      expect(await names('status=ARCHIVED')).toEqual(['Téléphones'])
      expect(await names('status=SUSPENDED')).toEqual(['Pagnes'])
      expect(await names('category=Textile')).toEqual(['Pagnes'])
      expect(await names('sort=name_asc')).toEqual(['Café Touba', 'Pagnes'])
      expect(await names('sort=start_asc&status=ACTIVE')).toEqual(['Café Touba'])
      expect(await names('search=%5E.*')).toEqual([]) // l'expression régulière est neutralisée

      const page = (await send('get', `${BASE}?pageSize=1&page=2&sort=name_asc`, cookie)).body
      expect(page.data.activities.map((item) => item.name)).toEqual(['Pagnes'])
      expect(page.meta).toMatchObject({ page: 2, pageSize: 1, total: 2, totalPages: 2 })
      expect(page.meta.counts).toEqual({ total: 3, ACTIVE: 1, SUSPENDED: 1, COMPLETED: 0, ARCHIVED: 1 })
      expect(page.meta.categories).toEqual(['Alimentation', 'Électronique', 'Textile'])
      expect(cafe.status).toBe('ACTIVE')
    })

    it('refuse les filtres invalides (400)', async () => {
      const cookie = await session(mohamed)
      for (const query of ['status=DELETED', 'sort=x', 'pageSize=500', 'page=0', 'foo=bar', 'status[$ne]=ACTIVE']) {
        expect([query, (await send('get', `${BASE}?${query}`, cookie)).status]).toEqual([query, 400])
      }
    })

    it('Mohamed et Cheikh voient exactement les mêmes activités', async () => {
      const a = await session(mohamed)
      await create(a)
      await create(a, { name: 'Autre activité', startDate: '2026-12-12' })
      const b = await session(cheikh)
      expect((await send('get', BASE, a)).body).toEqual((await send('get', BASE, b)).body)
      const id = (await send('get', BASE, a)).body.data.activities[0].id
      expect((await send('get', `${BASE}/${id}`, a)).body).toEqual((await send('get', `${BASE}/${id}`, b)).body)
    })
  })

  describe('modification', () => {
    it('modifie les informations, journalise avant/après, ne touche aucune opération', async () => {
      const cookie = await session(mohamed)
      const activity = await create(cookie)
      await addOperations(activity.id)
      const before = await operationsSnapshot()

      const res = await send('patch', `${BASE}/${activity.id}`, await session(cheikh), { name: 'Pagnes & wax', description: '', category: null })
      expect(res.status).toBe(200)
      expect(res.body.data.activity).toMatchObject({ name: 'Pagnes & wax', description: '', category: null })
      expect(await operationsSnapshot()).toEqual(before) // renommer ne détruit ni ne modifie aucune opération

      const audit = await AuditLog.findOne({ action: 'BUSINESS_UPDATED' })
      expect(String(audit.actor)).toBe(String(cheikh._id))
      expect(audit.before).toMatchObject({ name: 'Vente de pagnes', category: 'Textile' })
      expect(audit.after).toMatchObject({ name: 'Pagnes & wax', category: null })
    })

    it('sans changement réel : aucune écriture ni audit', async () => {
      const cookie = await session(mohamed)
      const activity = await create(cookie)
      const res = await send('patch', `${BASE}/${activity.id}`, cookie, { name: activity.name })
      expect(res.status).toBe(200)
      expect(await AuditLog.countDocuments({ action: 'BUSINESS_UPDATED' })).toBe(0)
    })

    it.each([
      ['corps vide', {}],
      ['statut', { status: 'ARCHIVED' }],
      ['champ interdit', { createdBy: 'a'.repeat(24) }],
      ['champ financier', { totalInvested: 1 }],
      ['nom trop court', { name: 'A' }],
      ['dates incohérentes', { startDate: '2026-12-10', endDate: '2026-12-01' }],
    ])('refuse : %s (400)', async (_label, body) => {
      const cookie = await session(mohamed)
      const activity = await create(cookie)
      expect((await send('patch', `${BASE}/${activity.id}`, cookie, body)).status).toBe(400)
    })

    it('refuse un nom déjà pris, une activité inexistante et une activité archivée', async () => {
      const cookie = await session(mohamed)
      const first = await create(cookie, { name: 'Première' })
      const second = await create(cookie, { name: 'Seconde', startDate: '2026-12-11' })
      expect((await send('patch', `${BASE}/${second.id}`, cookie, { name: 'PREMIERE' })).body.error.code).toBe('ACTIVITY_NAME_ALREADY_USED')
      expect((await send('patch', `${BASE}/${FAKE_ID}`, cookie, { name: 'Autre' })).status).toBe(404)
      await send('post', `${BASE}/${first.id}/archive`, cookie, {})
      const archived = await send('patch', `${BASE}/${first.id}`, cookie, { description: 'Retouche' })
      expect([archived.status, archived.body.error.code]).toEqual([409, 'ACTIVITY_ARCHIVED'])
    })

    it('la date de démarrage ne peut pas dépasser la première opération', async () => {
      const cookie = await session(mohamed)
      const activity = await create(cookie)
      await addOperations(activity.id) // première opération le 2026-12-11
      const res = await send('patch', `${BASE}/${activity.id}`, cookie, { startDate: '2026-12-14' })
      expect([res.status, res.body.error.code]).toEqual([409, 'START_DATE_AFTER_OPERATIONS'])
      expect((await send('patch', `${BASE}/${activity.id}`, cookie, { startDate: '2026-12-09' })).status).toBe(200)
    })
  })

  describe('statuts', () => {
    it('parcours complet : suspendre, réactiver, terminer, rouvrir (motif), archiver — montants inchangés', async () => {
      const cookie = await session(mohamed)
      const other = await session(cheikh)
      const activity = await create(cookie)
      await addOperations(activity.id)
      const before = await operationsSnapshot()
      const call = (action, body = {}, who = cookie) => send('post', `${BASE}/${activity.id}/${action}`, who, body)

      expect((await call('suspend')).body.data.activity).toMatchObject({ status: 'SUSPENDED', allowedActions: ['edit', 'reactivate', 'complete', 'archive'] })
      expect((await call('reactivate', {}, other)).body.data.activity.status).toBe('ACTIVE')

      const completed = (await call('complete', { endDate: '2026-12-18' })).body.data.activity
      expect(completed).toMatchObject({ status: 'COMPLETED', endDate: '2026-12-18', completedBy: { name: 'Mohamed Bakhoum' } })
      expect(completed.completedAt).toBe('2026-12-20T10:00:00.000Z')

      const noReason = await call('reopen', {})
      expect(noReason.status).toBe(400)
      const reopened = (await call('reopen', { reason: 'Nouveau lot de marchandises' }, other)).body.data.activity
      expect(reopened).toMatchObject({ status: 'ACTIVE', endDate: null, completedAt: null, completedBy: null })
      expect(reopened.reopenHistory).toEqual([{ reopenedAt: '2026-12-20T10:00:00.000Z', reopenedBy: { id: String(cheikh._id), name: 'Cheikh Sow' }, reason: 'Nouveau lot de marchandises', previousEndDate: '2026-12-18' }])

      const archived = (await call('archive')).body.data.activity
      expect(archived).toMatchObject({ status: 'ARCHIVED', archivedBy: { name: 'Mohamed Bakhoum' }, allowedActions: [] })

      expect(await operationsSnapshot()).toEqual(before) // aucun montant, aucune opération touchés
      const actions = (await AuditLog.find({ resourceType: 'BUSINESS' }).sort({ occurredAt: 1 })).map((row) => row.action)
      expect(actions).toEqual(['BUSINESS_CREATED', 'BUSINESS_SUSPENDED', 'BUSINESS_REACTIVATED', 'BUSINESS_COMPLETED', 'BUSINESS_REOPENED', 'BUSINESS_ARCHIVED'])
    })

    it('refuse les transitions interdites (409) sans rien modifier', async () => {
      const cookie = await session(mohamed)
      const activity = await create(cookie)
      const call = (action, body = {}) => send('post', `${BASE}/${activity.id}/${action}`, cookie, body)
      for (const action of ['reactivate']) expect((await call(action)).body.error.code).toBe('INVALID_STATUS_TRANSITION')
      expect((await call('reopen', { reason: 'Motif valable' })).status).toBe(409)
      await call('complete', { endDate: '2026-12-15' })
      expect((await call('suspend')).status).toBe(409) // terminée : pas de suspension
      expect((await call('complete')).status).toBe(409)
      await call('archive')
      for (const [action, body] of [['suspend', {}], ['reactivate', {}], ['complete', {}], ['reopen', { reason: 'Motif valable' }], ['archive', {}]]) {
        expect([action, (await call(action, body)).status]).toEqual([action, 409])
      }
      expect((await Business.findById(activity.id)).status).toBe('ARCHIVED')
    })

    it('terminer : date du jour par défaut ; refuse une date future, antérieure au début ou à une opération', async () => {
      const cookie = await session(mohamed)
      const activity = await create(cookie)
      await addOperations(activity.id)
      const call = (body) => send('post', `${BASE}/${activity.id}/complete`, cookie, body)
      expect((await call({ endDate: '2026-12-21' })).body.error.code).toBe('END_DATE_IN_FUTURE')
      expect((await call({ endDate: '2026-12-10' })).body.error.code).toBe('END_DATE_BEFORE_OPERATIONS')
      expect((await call({ endDate: '2026-12-09' })).status).toBe(422)
      expect((await call({ endDate: 'pas-une-date' })).status).toBe(400)
      const done = await call({})
      expect(done.body.data.activity.endDate).toBe('2026-12-20')
    })

    it('un corps non vide est refusé pour suspendre / archiver', async () => {
      const cookie = await session(mohamed)
      const activity = await create(cookie)
      expect((await send('post', `${BASE}/${activity.id}/suspend`, cookie, { status: 'ARCHIVED' })).status).toBe(400)
    })
  })

  describe('historique financier et Dashboard', () => {
    it('le Dashboard calcule les mêmes chiffres avant et après les changements de statut', async () => {
      const cookie = await session(mohamed)
      const activity = await create(cookie)
      await addOperations(activity.id)
      const dashboard = async () => (await send('get', '/api/v1/dashboard', cookie)).body.data
      const strip = (data) => ({ investments: data.investments.total, expenses: data.expenses.total, revenues: data.revenues.total, treasury: data.treasury.balance, result: data.result.amount, count: [data.investments.count, data.expenses.count, data.revenues.count] })

      const initial = strip(await dashboard())
      expect(initial).toEqual({ investments: 50000, expenses: 3000, revenues: 20000, treasury: -33000, result: 17000, count: [1, 1, 1] })

      await send('post', `${BASE}/${activity.id}/suspend`, cookie, {})
      const suspended = await dashboard()
      expect(strip(suspended)).toEqual(initial)
      expect(suspended.result.isProvisional).toBe(true) // une activité suspendue peut reprendre
      expect(suspended.investments.byStatus.SUSPENDED).toEqual({ businesses: 1, amount: 50000 })

      await send('post', `${BASE}/${activity.id}/reactivate`, cookie, {})
      await send('post', `${BASE}/${activity.id}/complete`, cookie, { endDate: '2026-12-18' })
      const completed = await dashboard()
      expect(strip(completed)).toEqual(initial)
      expect(completed.result.isProvisional).toBe(false)

      await send('post', `${BASE}/${activity.id}/archive`, cookie, {})
      const archived = await dashboard()
      expect(strip(archived)).toEqual(initial) // l'archivage conserve l'historique : rien n'est compté en double ni perdu
      expect(archived.investments.byStatus.ARCHIVED).toEqual({ businesses: 1, amount: 50000 })
    })

    it('les opérations restent rattachées à leur activité (relations valides) après modification et archivage', async () => {
      const cookie = await session(mohamed)
      const activity = await create(cookie)
      await addOperations(activity.id)
      await send('patch', `${BASE}/${activity.id}`, cookie, { name: 'Nouveau nom' })
      await send('post', `${BASE}/${activity.id}/archive`, cookie, {})
      const operations = await BusinessOperation.collection.find({}).toArray()
      expect(operations).toHaveLength(3)
      for (const operation of operations) expect(String(operation.business)).toBe(activity.id)
      expect(await Business.exists({ _id: operations[0].business })).toBeTruthy()
      expect((await send('get', `${BASE}/${activity.id}`, cookie)).body.data.activity.operationsCount).toBe(3)
    })
  })
})
