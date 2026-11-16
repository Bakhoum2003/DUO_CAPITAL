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
const BASE = '/api/v1/statistics'
const FAKE_ID = '507f1f77bcf86cd799439011'

describe.skipIf(!testDatabaseUrl())('API /api/v1/statistics (base de test)', () => {
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

  const data = async (query = '', cookie = cookieMohamed) => (await get(`${BASE}${query}`, cookie)).body.data
  const strip = (body) => ({ ...body, data: { ...body.data, generatedAt: undefined } })

  describe('protection', () => {
    it('refuse sans authentification (401)', async () => {
      expect((await send('get', BASE)).status).toBe(401)
      expect((await send('get', `${BASE}?period=month`)).status).toBe(401)
    })

    it('refuse une session révoquée', async () => {
      await Session.updateMany({ user: mohamed._id }, { $set: { revokedAt: new Date(), revokedReason: 'LOGOUT' } })
      expect((await get(BASE)).status).toBe(401)
    })

    it('Mohamed et Cheikh obtiennent exactement les mêmes statistiques, quelle que soit la période', async () => {
      await seedReference()
      for (const query of ['', '?period=month', '?period=week', '?period=custom&from=2026-12-05&to=2026-12-10']) {
        const a = await get(`${BASE}${query}`, cookieMohamed)
        const b = await get(`${BASE}${query}`, cookieCheikh)
        expect(a.status).toBe(200)
        expect(b.status).toBe(200)
        expect(strip(a.body)).toEqual(strip(b.body))
      }
    })

    it('aucune donnée sensible dans la réponse (email, hachage, jeton)', async () => {
      await seedReference()
      const text = JSON.stringify((await get(BASE)).body)
      for (const secret of ['mohamed@example.com', 'cheikh@example.com', 'passwordHash', 'dc_access', 'dc_refresh', 'refreshToken']) expect(text.includes(secret)).toBe(false)
    })
  })

  describe('lecture seule', () => {
    it('aucune écriture possible : 404 sur POST, PUT, PATCH, DELETE ; aucune donnée modifiée', async () => {
      await seedReference()
      const before = await snapshot()
      for (const method of ['post', 'put', 'patch', 'delete']) {
        for (const path of [BASE, `${BASE}/summary`, `${BASE}/${FAKE_ID}`]) expect((await send(method, path, cookieMohamed, {})).status).toBe(404)
      }
      expect(await snapshot()).toEqual(before)
    })

    it('consulter les statistiques ne modifie rien (aucun enregistrement, aucun AuditLog)', async () => {
      await seedReference()
      const before = await snapshot()
      for (const query of ['', '?period=month', '?period=last6months', '?period=year', '?period=custom&from=2026-12-01&to=2026-12-31']) await get(`${BASE}${query}`)
      expect(await snapshot()).toEqual(before)
    })
  })

  describe('calculs sur toute la période (jeu de référence)', () => {
    it('totaux par type, entrées, sorties, solde net, résultat commercial', async () => {
      await seedReference()
      const stats = await data()
      expect(stats.totals.contributions).toEqual({ amount: 70000, count: 2 })
      expect(stats.totals.revenues).toEqual({ amount: 20000, count: 1 })
      expect(stats.totals.investments).toEqual({ amount: 30000, count: 1 })
      expect(stats.totals.expenses).toEqual({ amount: 5000, count: 1 })
      expect(stats.totals.withdrawals).toEqual({ amount: 10000, count: 1 })
      expect(stats.totals.inflow).toBe(90000)
      expect(stats.totals.outflow).toBe(45000)
      expect(stats.totals.netBalance).toBe(45000)
      expect(stats.totals.commercialResult).toBe(20000 - 5000 - 30000)
      expect(stats.totals.operationsCount).toBe(6)
      expect(stats.currency).toBe('XOF')
      expect(stats.timeZone).toBe('Africa/Dakar')
    })

    it('aucun double comptage : le résultat commercial n’est pas ajouté aux entrées', async () => {
      await seedReference()
      const { totals } = await data()
      expect(totals.inflow).toBe(totals.contributions.amount + totals.revenues.amount)
      expect(totals.netBalance).toBe(totals.contributions.amount + totals.commercialResult - totals.withdrawals.amount)
    })

    it('exclut les opérations futures (signalées) et les enregistrements supprimés logiquement', async () => {
      await seedReference()
      const stats = await data()
      expect(stats.totals.contributions.amount).toBe(70000) // ni 15 000 futurs, ni 99 999 supprimés
      expect(stats.totals.expenses.amount).toBe(5000) // pas 88 888
      expect(stats.totals.withdrawals.amount).toBe(10000) // pas 77 777
      expect(stats.futureIgnored.count).toBe(1)
      expect(stats.notices.map((notice) => notice.code)).toContain('FUTURE_OPERATIONS_IGNORED')
    })

    it('cohérence avec la Trésorerie, l’Historique et le Dashboard', async () => {
      await seedReference()
      const stats = await data()
      const treasury = (await get('/api/v1/treasury/summary')).body.data
      const history = (await get('/api/v1/history/summary')).body.data
      const dashboard = (await get('/api/v1/dashboard?period=all')).body.data
      expect(stats.totals.netBalance).toBe(treasury.balance)
      expect(stats.totals.netBalance).toBe(history.totals.net)
      expect(stats.totals.netBalance).toBe(dashboard.treasury.balance)
      expect(stats.totals.inflow).toBe(dashboard.overview.inflow)
      expect(stats.totals.outflow).toBe(dashboard.overview.outflow)
      expect(stats.totals.operationsCount).toBe(treasury.movementsCount)
      expect(stats.totals.revenues.amount).toBe(dashboard.result.revenues)
      expect(stats.totals.expenses.amount).toBe(dashboard.result.expenses)
      expect(stats.totals.commercialResult).toBe(dashboard.result.amount - stats.totals.investments.amount)
    })

    it('dépenses par catégorie réelle, performance par activité, nombres', async () => {
      await seedReference()
      const stats = await data()
      expect(stats.expensesByCategory).toEqual([{ id: null, label: 'Textile', amount: 5000, count: 1, percent: 100 }])
      expect(stats.activities.map((row) => [row.name, row.revenues, row.expenses, row.investments, row.result])).toEqual([
        ['Savon Noir', 20000, 0, 0, 20000],
        ['Pagnes Wax', 0, 5000, 30000, -35000],
      ])
      expect(stats.activities.reduce((total, row) => total + row.result, 0)).toBe(stats.totals.commercialResult)
      expect(stats.counts).toMatchObject({ operations: 6, activities: 2, months: 1, byType: { CONTRIBUTION: 2, REVENUE: 1, INVESTMENT: 1, EXPENSE: 1, WITHDRAWAL: 1 } })
      expect(stats.monthly.map((row) => row.month)).toEqual(['2026-12'])
    })

    it('comparaison des associés : identifiants réels, objectif 15 000, montants non plafonnés', async () => {
      await seedReference()
      const { contributionComparison } = await data()
      expect(contributionComparison).toMatchObject({ monthlyTarget: 15000, fundStartPeriod: '2026-12', objectiveAvailable: true })
      const [first, second] = contributionComparison.partners
      expect([first.partnerId, first.name]).toEqual([String(mohamed._id), 'Mohamed Bakhoum'])
      expect([second.partnerId, second.name]).toEqual([String(cheikh._id), 'Cheikh Sow'])
      expect(first.months).toEqual([{ month: '2026-12', contributed: 40000, target: 15000, percent: 100, remaining: 0, status: 'ACHIEVED', overdue: false }])
      expect(second.contributed).toBe(30000)
      expect(second.percent).toBe(100)
    })

    it('base vide : zéros, listes vides, aucune valeur inventée', async () => {
      const stats = await data()
      expect(stats.totals.operationsCount).toBe(0)
      expect([stats.totals.inflow, stats.totals.outflow, stats.totals.netBalance, stats.totals.commercialResult]).toEqual([0, 0, 0, 0])
      expect(stats.monthly).toEqual([])
      expect(stats.expensesByCategory).toEqual([])
      expect(stats.activities).toEqual([])
      expect(stats.contributionComparison.partners.map((row) => row.name)).toEqual(['Mohamed Bakhoum', 'Cheikh Sow'])
      expect(stats.previousPeriod).toBeNull()
    })
  })

  describe('périodes', () => {
    it('semaine (du lundi 14 au dimanche 20 décembre)', async () => {
      await seedReference()
      const stats = await data('?period=week')
      expect(stats.period).toMatchObject({ key: 'week', from: '2026-12-14', to: '2026-12-20' })
      expect([stats.totals.inflow, stats.totals.outflow, stats.totals.netBalance]).toEqual([20000, 10000, 10000])
      expect(stats.previousPeriod).toMatchObject({ from: '2026-12-07', to: '2026-12-13', hasMovements: true })
    })

    it('mois : du 1er à aujourd’hui ; comparé au mois précédent (sans donnée : aucune comparaison inventée)', async () => {
      await seedReference()
      const stats = await data('?period=month')
      expect(stats.period).toMatchObject({ from: '2026-12-01', to: '2026-12-20' })
      expect(stats.totals.netBalance).toBe(45000)
      expect(stats.previousPeriod).toMatchObject({ from: '2026-11-01', to: '2026-11-20', hasMovements: false })
      expect(stats.previousPeriod.totals.netBalance).toBe(0)
    })

    it('3 mois, 6 mois et année contiennent tout le jeu de référence', async () => {
      await seedReference()
      const expected = { last3months: '2026-09-21', last6months: '2026-06-21', year: '2026-01-01' }
      for (const [period, from] of Object.entries(expected)) {
        const stats = await data(`?period=${period}`)
        expect(stats.period.from).toBe(from)
        expect(stats.totals.netBalance).toBe(45000)
      }
    })

    it('période personnalisée : bornes incluses', async () => {
      await seedReference()
      const stats = await data('?period=custom&from=2026-12-05&to=2026-12-06')
      expect(stats.totals.contributions.amount).toBe(70000) // le 5 (début) et le 6 (fin) comptent
      expect(stats.totals.operationsCount).toBe(2)
      const narrow = await data('?period=custom&from=2026-12-06&to=2026-12-09')
      expect(narrow.totals.contributions.amount).toBe(30000)
    })

    it('personnalisée dans le futur : fin plafonnée à aujourd’hui, aucune opération future comptée', async () => {
      await seedReference()
      const stats = await data('?period=custom&from=2026-12-01&to=2027-01-31')
      expect(stats.period).toMatchObject({ to: '2026-12-20', requestedTo: '2027-01-31' })
      expect(stats.totals.contributions.amount).toBe(70000)
    })

    it('période sans opération : zéros ; période future : vide', async () => {
      await seedReference()
      expect((await data('?period=custom&from=2026-12-19&to=2026-12-19')).totals.operationsCount).toBe(0)
      const future = await data('?period=custom&from=2027-03-01&to=2027-03-10')
      expect(future.period.isEmpty).toBe(true)
      expect(future.monthly).toEqual([])
    })

    it('refuse les paramètres invalides (400) sans rien calculer', async () => {
      for (const query of [
        '?period=quarter',
        '?period=3months',
        '?period=custom',
        '?period=custom&from=2026-12-10&to=2026-12-01',
        '?period=custom&from=2026-02-30&to=2026-03-10',
        '?period=month&from=2026-12-01',
        '?period=month&admin=1',
        '?period=week&period=month',
      ]) {
        expect((await get(`${BASE}${query}`)).status).toBe(400)
      }
    })
  })

  describe('changements de données', () => {
    it('une nouvelle opération apparaît à la requête suivante (aucun cache)', async () => {
      await seedReference()
      expect((await data()).totals.netBalance).toBe(45000)
      await addOperation(soap, 'REVENUE', 7000, '2026-12-19')
      const stats = await data()
      expect(stats.totals.netBalance).toBe(52000)
      expect(stats.totals.revenues.amount).toBe(27000)
    })

    it('un retrait créé par le module Retraits est pris en compte dans les sorties', async () => {
      await seedReference()
      const res = await send('post', '/api/v1/withdrawals', cookieMohamed, { beneficiaryId: String(cheikh._id), amount: 5000, withdrawalDate: '2026-12-19', reason: 'Besoin personnel' }).set('Idempotency-Key', 'stats-withdrawal-1')
      expect(res.status).toBe(201)
      const stats = await data()
      expect(stats.totals.withdrawals).toEqual({ amount: 15000, count: 2 })
      expect(stats.totals.netBalance).toBe(40000)
    })
  })
})
