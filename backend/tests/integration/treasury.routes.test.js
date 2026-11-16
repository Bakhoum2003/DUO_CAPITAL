// Horloge métier fixée au 20 décembre 2026. Les enregistrements financiers sont insérés dans la base de test uniquement.
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { AuditLog } from '../../src/models/AuditLog.js'
import { Business } from '../../src/models/Business.js'
import { BusinessOperation } from '../../src/models/BusinessOperation.js'
import { Contribution } from '../../src/models/Contribution.js'
import { Session } from '../../src/models/Session.js'
import { TreasuryLock } from '../../src/models/TreasuryLock.js'
import { Withdrawal } from '../../src/models/Withdrawal.js'
import { recordAudit } from '../../src/services/audit.service.js'
import { createTreasuryService } from '../../src/services/treasury.service.js'
import { createLogger } from '../../src/utils/logger.js'
import { TEST_PASSWORD, cookieHeader, createTestUser, readSetCookie, testDatabaseUrl, useTestDatabase } from '../helpers/authFixtures.js'
import { FRONTEND_ORIGIN, buildTestConfig, withAuth } from '../helpers/testConfig.js'

const logger = createLogger({ level: 'silent', environment: 'test' })
const config = withAuth(buildTestConfig({ FUND_START_PERIOD: '2026-12' }), {
  loginRateLimit: { windowMs: 60_000, max: 1000 },
  sensitiveActionRateLimit: { windowMs: 60_000, max: 1000 },
})
const clock = () => new Date('2026-12-20T10:00:00.000Z')
const BASE = '/api/v1/treasury'
const FAKE_ID = '507f1f77bcf86cd799439011'

describe.skipIf(!testDatabaseUrl())('API /api/v1/treasury (base de test)', () => {
  const { database } = useTestDatabase()
  let app
  let service
  let mohamed
  let cheikh
  let business

  beforeAll(async () => {
    await Promise.all([Business, BusinessOperation, Contribution, Withdrawal, TreasuryLock, AuditLog].map((model) => model.init()))
    app = createApp({ config, logger, database, clock })
    service = createTreasuryService({ clock })
  })

  beforeEach(async () => {
    ;({ user: mohamed } = await createTestUser({ partnerNumber: 1, name: 'Mohamed Bakhoum', email: 'mohamed@example.com' }))
    ;({ user: cheikh } = await createTestUser({ partnerNumber: 2, name: 'Cheikh Sow', email: 'cheikh@example.com' }))
    const now = new Date()
    business = (await Business.collection.insertOne({ name: 'Pagnes Wax', category: 'Textile', status: 'ACTIVE', startDate: '2026-12-01', description: '', createdBy: mohamed._id, createdAt: now, updatedAt: now })).insertedId
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

  const base = () => ({ deletedAt: null, createdAt: new Date(), updatedAt: new Date() })
  const addContribution = (partner, amount, contributionDate, extra = {}) =>
    Contribution.collection.insertOne({ partner: partner._id, amount, contributionDate, period: contributionDate.slice(0, 7), note: null, recordedBy: partner._id, ...base(), ...extra })
  const addOperation = (type, amount, operationDate, extra = {}) =>
    BusinessOperation.collection.insertOne({ business, type, amount, operationDate, description: `${type} test`, concernedPartner: null, recordedBy: mohamed._id, receipt: null, ...base(), ...extra })
  const addWithdrawal = (amount, withdrawalDate, extra = {}) =>
    Withdrawal.collection.insertOne({ beneficiary: cheikh._id, amount, withdrawalDate, reason: 'Besoin personnel', recordedBy: cheikh._id, ...base(), ...extra })

  /** Jeu de données de référence : solde attendu 45 000 FCFA. */
  async function seedReference() {
    await addContribution(mohamed, 40000, '2026-12-05')
    await addContribution(cheikh, 30000, '2026-12-06')
    await addOperation('INVESTMENT', 30000, '2026-12-10', { description: 'Achat de tissus', concernedPartner: mohamed._id, receipt: { reference: 'FAC-1', url: 'https://exemple.sn/f1' } })
    await addOperation('EXPENSE', 5000, '2026-12-12', { description: 'Transport' })
    await addOperation('REVENUE', 20000, '2026-12-15', { description: 'Vente de pagnes', concernedPartner: cheikh._id })
    await addWithdrawal(10000, '2026-12-18')
    await addContribution(mohamed, 15000, '2027-01-05')
    await addContribution(mohamed, 99999, '2026-12-07', { deletedAt: new Date(), deletedBy: mohamed._id })
    await addOperation('EXPENSE', 88888, '2026-12-08', { deletedAt: new Date(), deletedBy: mohamed._id })
    await addWithdrawal(77777, '2026-12-09', { deletedAt: new Date(), deletedBy: mohamed._id })
  }
  const snapshot = async () => ({
    contributions: await Contribution.collection.countDocuments(),
    operations: await BusinessOperation.collection.countDocuments(),
    withdrawals: await Withdrawal.collection.countDocuments(),
  })

  describe('protection', () => {
    it('refuse tout sans authentification (401)', async () => {
      for (const path of [`${BASE}/summary`, `${BASE}/movements`, `${BASE}/movements/WITHDRAWAL/${FAKE_ID}`]) expect((await send('get', path)).status).toBe(401)
    })

    it('refuse une session révoquée', async () => {
      const cookie = await session(mohamed)
      await Session.updateMany({ user: mohamed._id }, { $set: { revokedAt: new Date(), revokedReason: 'LOGOUT' } })
      expect((await send('get', `${BASE}/summary`, cookie)).status).toBe(401)
    })

    it("lecture seule : aucune route d'écriture n'existe", async () => {
      const cookie = await session(mohamed)
      for (const [method, path] of [['post', `${BASE}/movements`], ['post', `${BASE}/withdrawals`], ['patch', `${BASE}/movements/WITHDRAWAL/${FAKE_ID}`], ['delete', `${BASE}/movements/WITHDRAWAL/${FAKE_ID}`], ['post', `${BASE}/summary`]]) {
        expect([method, path, (await send(method, path, cookie, {})).status]).toEqual([method, path, 404])
      }
    })
  })

  describe('solde', () => {
    it('calcule solde, entrées, sorties et totaux par type à partir des enregistrements réels', async () => {
      await seedReference()
      const res = await send('get', `${BASE}/summary`, await session(mohamed))
      expect(res.status).toBe(200)
      const summary = res.body.data
      expect(summary).toMatchObject({ balance: 45000, inflow: 90000, outflow: 45000, movementsCount: 6, lastMovementDate: '2026-12-18', asOf: '2026-12-20', currency: 'XOF' })
      expect(summary.contributions).toEqual({ amount: 70000, count: 2 })
      expect(summary.revenues).toEqual({ amount: 20000, count: 1 })
      expect(summary.investments).toEqual({ amount: 30000, count: 1 })
      expect(summary.expenses).toEqual({ amount: 5000, count: 1 })
      expect(summary.withdrawals).toEqual({ amount: 10000, count: 1 })
      expect(summary.futureIgnored).toEqual({ count: 1, amount: 15000 })
      expect(summary.partners.map((p) => [p.partnerNumber, p.name])).toEqual([[1, 'Mohamed Bakhoum'], [2, 'Cheikh Sow']])
      expect(summary.components.map((c) => c.type)).toEqual(['CONTRIBUTION', 'REVENUE', 'INVESTMENT', 'EXPENSE', 'WITHDRAWAL'])
      expect(summary.notices.map((n) => n.code)).toEqual(['NO_INITIAL_BALANCE', 'FUTURE_MOVEMENTS_IGNORED'])
      expect(summary.evolution.points.at(-1).balance).toBe(summary.balance)
    })

    it('trésorerie vide : zéro partout, aucun solde inventé', async () => {
      const res = await send('get', `${BASE}/summary`, await session(cheikh))
      expect(res.body.data).toMatchObject({ balance: 0, inflow: 0, outflow: 0, movementsCount: 0, lastMovementDate: null })
      expect(res.body.data.evolution.points).toEqual([])
    })

    it('Mohamed et Cheikh voient exactement la même trésorerie (même horloge, mêmes chiffres)', async () => {
      await seedReference()
      const a = (await send('get', `${BASE}/summary`, await session(mohamed))).body.data
      const b = (await send('get', `${BASE}/summary`, await session(cheikh))).body.data
      expect({ ...a, generatedAt: null }).toEqual({ ...b, generatedAt: null })
      const listA = (await send('get', `${BASE}/movements`, await session(mohamed))).body
      const listB = (await send('get', `${BASE}/movements`, await session(cheikh))).body
      expect(listA).toEqual(listB)
    })

    it('même solde que le Dashboard validé (Phase C) : aucun calcul divergent', async () => {
      await seedReference()
      const cookie = await session(mohamed)
      const dashboard = (await send('get', '/api/v1/dashboard?period=all', cookie)).body.data
      const summary = (await send('get', `${BASE}/summary`, cookie)).body.data
      expect(dashboard.treasury.balance).toBe(summary.balance)
      expect(summary.balance).toBe(45000)
    })
  })

  describe('historique', () => {
    it('ne contient que les mouvements passés non supprimés, chacun une seule fois, du plus récent au plus ancien', async () => {
      await seedReference()
      const res = await send('get', `${BASE}/movements`, await session(mohamed))
      expect(res.status).toBe(200)
      const types = res.body.data.movements.map((m) => `${m.type}:${m.date}`)
      expect(types).toEqual(['WITHDRAWAL:2026-12-18', 'REVENUE:2026-12-15', 'EXPENSE:2026-12-12', 'INVESTMENT:2026-12-10', 'CONTRIBUTION:2026-12-06', 'CONTRIBUTION:2026-12-05'])
      expect(new Set(res.body.data.movements.map((m) => `${m.type}-${m.id}`)).size).toBe(6)
      expect(res.body.meta).toMatchObject({ total: 6, page: 1, totalPages: 1, categories: ['Textile'] })
      expect(res.body.meta.filtered).toEqual({ count: 6, inflow: 90000, outflow: 45000, net: 45000 })
      for (const forbidden of ['passwordHash', '$argon2', 'email', 'refreshTokenHash']) expect(res.text).not.toContain(forbidden)
    })

    it('recherche (sans accent), filtres type / sens / catégorie / associé / période, tri et pagination', async () => {
      await seedReference()
      const cookie = await session(mohamed)
      const ids = async (query) => (await send('get', `${BASE}/movements?${query}`, cookie)).body.data.movements.map((m) => `${m.type}:${m.amount}`)
      expect(await ids('search=TRANSPORT')).toEqual(['EXPENSE:5000'])
      expect(await ids('search=pagnes')).toEqual(['REVENUE:20000', 'EXPENSE:5000', 'INVESTMENT:30000']) // description ou nom de l'activité
      expect(await ids('type=WITHDRAWAL')).toEqual(['WITHDRAWAL:10000'])
      expect(await ids('type=CONTRIBUTION&sort=amount_desc')).toEqual(['CONTRIBUTION:40000', 'CONTRIBUTION:30000'])
      expect(await ids('direction=IN&sort=amount_asc')).toEqual(['REVENUE:20000', 'CONTRIBUTION:30000', 'CONTRIBUTION:40000'])
      expect(await ids('category=textile&type=EXPENSE')).toEqual(['EXPENSE:5000'])
      expect(await ids(`partnerId=${cheikh._id}&type=CONTRIBUTION`)).toEqual(['CONTRIBUTION:30000'])
      expect(await ids('from=2026-12-10&to=2026-12-12&sort=date_asc')).toEqual(['INVESTMENT:30000', 'EXPENSE:5000'])
      expect(await ids('search=introuvable')).toEqual([])

      const page = (await send('get', `${BASE}/movements?pageSize=2&page=3&sort=date_desc`, cookie)).body
      expect(page.data.movements.map((m) => m.amount)).toEqual([30000, 40000])
      expect(page.meta).toMatchObject({ page: 3, pageSize: 2, total: 6, totalPages: 3 })
    })

    it('refuse les paramètres invalides (400)', async () => {
      const cookie = await session(mohamed)
      for (const query of ['type=REFUND', 'direction=SIDE', 'sort=x', 'pageSize=500', 'page=0', 'from=2026-02-30', 'from=2026-12-10&to=2026-12-01', 'partnerId=abc', 'foo=bar', 'type[$ne]=X']) {
        expect([query, (await send('get', `${BASE}/movements?${query}`, cookie)).status]).toEqual([query, 400])
      }
    })
  })

  describe('détail', () => {
    it("retourne l'enregistrement d'origine, sans champ inventé", async () => {
      await seedReference()
      const cookie = await session(cheikh)
      const list = (await send('get', `${BASE}/movements`, cookie)).body.data.movements
      const find = (type) => list.find((m) => m.type === type)

      const investment = (await send('get', `${BASE}/movements/INVESTMENT/${find('INVESTMENT').id}`, cookie)).body.data.movement
      expect(investment).toMatchObject({ type: 'INVESTMENT', direction: 'OUT', amount: 30000, signedAmount: -30000, description: 'Achat de tissus', countedInBalance: true })
      expect(investment.activity).toMatchObject({ name: 'Pagnes Wax', status: 'ACTIVE' })
      expect(investment.details).toEqual({ receipt: { reference: 'FAC-1', url: 'https://exemple.sn/f1' } })
      expect(investment.origin).toEqual({ collection: 'operations', id: find('INVESTMENT').id })
      expect(investment.partner.name).toBe('Mohamed Bakhoum')
      expect(investment.recordedBy.name).toBe('Mohamed Bakhoum')

      const withdrawal = (await send('get', `${BASE}/movements/WITHDRAWAL/${find('WITHDRAWAL').id}`, cookie)).body.data.movement
      expect(withdrawal).toMatchObject({ signedAmount: -10000, details: { reason: 'Besoin personnel' }, partner: { name: 'Cheikh Sow' } })
      const contribution = (await send('get', `${BASE}/movements/CONTRIBUTION/${find('CONTRIBUTION').id}`, cookie)).body.data.movement
      expect(contribution.details).toEqual({ period: '2026-12', note: null })
    })

    it('mouvement futur : consultable mais « non compté » ; supprimé ou inexistant : 404 ; identifiants invalides : 400', async () => {
      await seedReference()
      const cookie = await session(mohamed)
      const future = await Contribution.collection.findOne({ contributionDate: '2027-01-05' })
      const futureRes = await send('get', `${BASE}/movements/CONTRIBUTION/${future._id}`, cookie)
      expect(futureRes.body.data.movement).toMatchObject({ countedInBalance: false })
      const deleted = await Contribution.collection.findOne({ amount: 99999 })
      expect((await send('get', `${BASE}/movements/CONTRIBUTION/${deleted._id}`, cookie)).body.error.code).toBe('MOVEMENT_NOT_FOUND')
      expect((await send('get', `${BASE}/movements/CONTRIBUTION/${FAKE_ID}`, cookie)).status).toBe(404)
      expect((await send('get', `${BASE}/movements/EXPENSE/${future._id}`, cookie)).status).toBe(404) // mauvais type pour cet identifiant
      expect((await send('get', `${BASE}/movements/CONTRIBUTION/pas-un-id`, cookie)).body.error.code).toBe('INVALID_ID')
      expect((await send('get', `${BASE}/movements/REFUND/${FAKE_ID}`, cookie)).body.error.code).toBe('INVALID_MOVEMENT_TYPE')
    })
  })

  describe('garde des sorties (atomicité et concurrence)', () => {
    const withdraw = (amount, { date = '2026-12-19', actor = mohamed } = {}) =>
      service.guard.runOutflow({
        amount,
        date,
        write: async (dbSession, { balanceBefore }) => {
          const [doc] = await Withdrawal.create([{ beneficiary: actor._id, amount, withdrawalDate: date, reason: 'Test de concurrence', recordedBy: actor._id }], { session: dbSession })
          await recordAudit({ actor: String(actor._id), actorName: actor.name, action: 'WITHDRAWAL_CREATED', resourceType: 'WITHDRAWAL', resourceId: doc._id, after: { amount, balanceBefore } }, { dbSession })
          return doc
        },
      })
    const summaryBalance = async () => (await service.getSummary()).balance

    it('accepte une sortie couverte par le solde, avec son AuditLog', async () => {
      await addContribution(mohamed, 100000, '2026-12-05')
      const doc = await withdraw(60000)
      expect(doc.amount).toBe(60000)
      expect(await summaryBalance()).toBe(40000)
      const audit = await AuditLog.find({ action: 'WITHDRAWAL_CREATED' })
      expect(audit).toHaveLength(1)
      expect(String(audit[0].actor)).toBe(String(mohamed._id))
      expect(String(audit[0].resourceId)).toBe(String(doc._id))
    })

    it("accepte exactement le solde disponible (solde final 0), refuse un franc de plus", async () => {
      await addContribution(mohamed, 50000, '2026-12-05')
      await expect(withdraw(50001)).rejects.toMatchObject({ status: 409, code: 'INSUFFICIENT_TREASURY' })
      await withdraw(50000)
      expect(await summaryBalance()).toBe(0)
      await expect(withdraw(1)).rejects.toMatchObject({ code: 'INSUFFICIENT_TREASURY' })
    })

    it('solde insuffisant : aucun enregistrement, aucun AuditLog, soldes inchangés, verrou non incrémenté', async () => {
      await seedReference() // solde 45 000
      const before = await snapshot()
      const lockVersion = async () => (await TreasuryLock.findById('FUND').lean())?.version ?? 0
      const lockBefore = await lockVersion()
      const auditBefore = await AuditLog.countDocuments()
      await expect(withdraw(45001)).rejects.toMatchObject({ status: 409, code: 'INSUFFICIENT_TREASURY', message: expect.stringContaining('45000') })
      expect(await snapshot()).toEqual(before)
      expect(await AuditLog.countDocuments()).toBe(auditBefore)
      expect(await lockVersion()).toBe(lockBefore) // l'incrémentation du verrou est annulée avec la transaction
      expect(await summaryBalance()).toBe(45000)
    })

    it("une écriture qui échoue dans la transaction ne laisse aucune trace (retrait + audit annulés ensemble)", async () => {
      await addContribution(mohamed, 100000, '2026-12-05')
      await expect(
        service.guard.runOutflow({
          amount: 10000,
          date: '2026-12-19',
          write: async (dbSession) => {
            await Withdrawal.create([{ beneficiary: mohamed._id, amount: 10000, withdrawalDate: '2026-12-19', recordedBy: mohamed._id }], { session: dbSession })
            throw new Error('panne simulée après la première écriture')
          },
        }),
      ).rejects.toThrow('panne simulée')
      expect(await Withdrawal.collection.countDocuments()).toBe(0)
      expect(await summaryBalance()).toBe(100000)
    })

    it('refuse un montant invalide et une date future, sans rien écrire', async () => {
      await addContribution(mohamed, 100000, '2026-12-05')
      for (const amount of [0, -5, 10.5, '5000', null, Number.NaN]) {
        await expect(withdraw(amount)).rejects.toMatchObject({ code: 'INVALID_OUTFLOW_AMOUNT' })
      }
      await expect(withdraw(1000, { date: '2026-12-21' })).rejects.toMatchObject({ code: 'OUTFLOW_DATE_IN_FUTURE' })
      await expect(withdraw(1000, { date: '2026-02-30' })).rejects.toMatchObject({ code: 'INVALID_OUTFLOW_DATE' })
      expect(await Withdrawal.collection.countDocuments()).toBe(0)
    })

    it('un mouvement futur ne finance jamais une sortie (seul le solde du jour compte)', async () => {
      await addContribution(mohamed, 20000, '2026-12-05')
      await addContribution(mohamed, 500000, '2027-03-01') // pas encore encaissé
      await expect(withdraw(30000)).rejects.toMatchObject({ code: 'INSUFFICIENT_TREASURY' })
      await withdraw(20000)
    })

    it('opérations concurrentes : 6 retraits simultanés de 60 000 FCFA pour 100 000 FCFA → un seul réussit', async () => {
      await addContribution(mohamed, 100000, '2026-12-05')
      const results = await Promise.allSettled(Array.from({ length: 6 }, (_, index) => withdraw(60000, { actor: index % 2 ? cheikh : mohamed })))
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
      for (const failure of results.filter((r) => r.status === 'rejected')) expect(failure.reason).toMatchObject({ code: 'INSUFFICIENT_TREASURY' })
      expect(await Withdrawal.collection.countDocuments()).toBe(1)
      expect(await AuditLog.countDocuments({ action: 'WITHDRAWAL_CREATED' })).toBe(1)
      expect(await summaryBalance()).toBe(40000)
    })

    it('opérations concurrentes : 12 retraits de 10 000 FCFA pour 100 000 FCFA → exactement 10 réussissent, solde final 0, jamais négatif', async () => {
      await addContribution(mohamed, 100000, '2026-12-05')
      const results = await Promise.allSettled(Array.from({ length: 12 }, () => withdraw(10000)))
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(10)
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(2)
      expect(await Withdrawal.collection.countDocuments()).toBe(10)
      expect(await AuditLog.countDocuments({ action: 'WITHDRAWAL_CREATED' })).toBe(10)
      expect(await summaryBalance()).toBe(0)
    })

    it('chaque sortie comptée une seule fois : la consultation reflète exactement les retraits réussis', async () => {
      await addContribution(mohamed, 100000, '2026-12-05')
      await withdraw(25000)
      await withdraw(25000, { actor: cheikh })
      const res = await send('get', `${BASE}/summary`, await session(cheikh))
      expect(res.body.data.withdrawals).toEqual({ amount: 50000, count: 2 })
      expect(res.body.data.balance).toBe(50000)
    })
  })
})
