// Horloge métier fixée au 20 décembre 2026 ; début du fonds : 2026-12. Les cotisations sont insérées dans la base de test uniquement.
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { AuditLog } from '../../src/models/AuditLog.js'
import { Business } from '../../src/models/Business.js'
import { BusinessOperation } from '../../src/models/BusinessOperation.js'
import { Contribution } from '../../src/models/Contribution.js'
import { FundSettings } from '../../src/models/FundSettings.js'
import { IdempotencyKey } from '../../src/models/IdempotencyKey.js'
import { Session } from '../../src/models/Session.js'
import { TreasuryLock } from '../../src/models/TreasuryLock.js'
import { User } from '../../src/models/User.js'
import { UserPreferences } from '../../src/models/UserPreferences.js'
import { Withdrawal } from '../../src/models/Withdrawal.js'
import { createLogger } from '../../src/utils/logger.js'
import { TEST_PASSWORD, cookieHeader, createTestUser, readSetCookie, testDatabaseUrl, useTestDatabase } from '../helpers/authFixtures.js'
import { FRONTEND_ORIGIN, buildTestConfig, withAuth } from '../helpers/testConfig.js'

const logger = createLogger({ level: 'silent', environment: 'test' })
const authPatch = { loginRateLimit: { windowMs: 60_000, max: 1000 }, sensitiveActionRateLimit: { windowMs: 60_000, max: 1000 } }
const config = withAuth(buildTestConfig({ FUND_START_PERIOD: '2026-12' }), authPatch)
const BASE = '/api/v1/settings'
const DEFAULT_DESCRIPTION = "Fonds d'investissement commun de deux associés, Mohamed Bakhoum et Cheikh Sow : cotisations mensuelles, activités commerciales et suivi des résultats."
const DEFAULT_PROJECT_INFO = 'Objectif : faire fructifier le capital en finançant ensemble de petites activités commerciales.'

describe.skipIf(!testDatabaseUrl())('API /api/v1/settings (base de test)', () => {
  const { database } = useTestDatabase()
  let clockValue
  let app
  let mohamed
  let cheikh
  let cookieMohamed
  let cookieCheikh

  const makeApp = (appConfig = config) => createApp({ config: appConfig, logger, database, clock: () => clockValue })

  beforeAll(async () => {
    await Promise.all([Business, BusinessOperation, Contribution, Withdrawal, IdempotencyKey, TreasuryLock, FundSettings, UserPreferences].map((model) => model.init()))
    app = makeApp()
  })

  beforeEach(async () => {
    clockValue = new Date('2026-12-20T10:00:00.000Z')
    ;({ user: mohamed } = await createTestUser({ partnerNumber: 1, name: 'Mohamed Bakhoum', email: 'mohamed@example.com' }))
    ;({ user: cheikh } = await createTestUser({ partnerNumber: 2, name: 'Cheikh Sow', email: 'cheikh@example.com' }))
    cookieMohamed = await login(mohamed)
    cookieCheikh = await login(cheikh)
  })

  async function login(user, target = app) {
    const res = await request(target).post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD })
    expect(res.status).toBe(200)
    return cookieHeader({ dc_access: readSetCookie(res, 'dc_access').value, dc_refresh: readSetCookie(res, 'dc_refresh').value })
  }
  const send = (method, path, cookie, body, target = app) => {
    let req = request(target)[method](path).set('Origin', FRONTEND_ORIGIN)
    if (cookie) req = req.set('Cookie', cookie)
    return body === undefined ? req : req.send(body)
  }
  const get = (path, cookie = cookieMohamed, target = app) => send('get', path, cookie, undefined, target)
  const put = (path, body, cookie = cookieMohamed) => send('put', path, cookie, body)
  const post = (path, body = {}, cookie = cookieMohamed) => send('post', path, cookie, body)

  const stripTime = (body) => JSON.parse(JSON.stringify(body, (key, value) => (key === 'generatedAt' ? undefined : value)))
  const base = () => ({ deletedAt: null, createdAt: new Date(), updatedAt: new Date() })
  const addContribution = async (partner, amount, contributionDate, extra = {}) =>
    (await Contribution.collection.insertOne({ partner: partner._id, amount, contributionDate, period: contributionDate.slice(0, 7), note: null, recordedBy: partner._id, ...base(), ...extra })).insertedId
  const financialSnapshot = async () => ({
    contributions: await Contribution.collection.find({}).toArray(),
    operations: await BusinessOperation.collection.find({}).toArray(),
    withdrawals: await Withdrawal.collection.find({}).toArray(),
    businesses: await Business.collection.find({}).toArray(),
    locks: await TreasuryLock.collection.find({}).toArray(),
  })
  const audits = () => AuditLog.collection.find({ resourceType: 'SETTINGS' }).sort({ occurredAt: 1 }).toArray()

  describe('protection', () => {
    const routes = [
      ['get', BASE],
      ['put', BASE],
      ['get', `${BASE}/preferences`],
      ['put', `${BASE}/preferences`],
      ['post', `${BASE}/preferences/reset`],
      ['get', `${BASE}/contribution-reminders`],
      ['get', `${BASE}/security`],
    ]

    it('toutes les routes refusent un utilisateur non authentifié (401) sans rien écrire', async () => {
      for (const [method, path] of routes) {
        const res = await send(method, path, undefined, method === 'get' ? undefined : { expectedVersion: 0, description: 'Une description valide', theme: 'dark' })
        expect([method, path, res.status]).toEqual([method, path, 401])
      }
      expect(await FundSettings.collection.countDocuments()).toBe(0)
      expect(await UserPreferences.collection.countDocuments()).toBe(0)
      expect(await AuditLog.collection.countDocuments({ resourceType: 'SETTINGS' })).toBe(0)
    })

    it('refuse une session révoquée sur chaque route', async () => {
      await Session.updateMany({ user: mohamed._id }, { $set: { revokedAt: new Date(), revokedReason: 'LOGOUT' } })
      for (const [method, path] of routes) {
        const res = await send(method, path, cookieMohamed, method === 'get' ? undefined : { expectedVersion: 0, description: 'Une description valide', theme: 'dark' })
        expect([method, path, res.status]).toEqual([method, path, 401])
      }
      expect(await FundSettings.collection.countDocuments()).toBe(0)
    })

    it('aucune route d’envoi d’email n’existe', async () => {
      for (const path of [`${BASE}/email`, `${BASE}/notifications/email`, `${BASE}/email-notifications`, `${BASE}/send-test-email`]) {
        expect((await post(path)).status).toBe(404)
      }
    })
  })

  describe('GET /settings : paramètres communs', () => {
    it('renvoie les valeurs actuelles de l’application tant que rien n’a été enregistré (version 0)', async () => {
      const res = await get(BASE)
      expect(res.status).toBe(200)
      expect(res.headers['cache-control']).toBe('no-store')
      expect(res.body.data.fund).toEqual({ description: DEFAULT_DESCRIPTION, projectInfo: DEFAULT_PROJECT_INFO, version: 0, isDefault: true, updatedAt: null, updatedBy: null })
    })

    it('expose l’identité officielle, la devise et les objectifs depuis la configuration (jamais modifiables)', async () => {
      const { identity, objectives, editableFields, limits } = (await get(BASE)).body.data
      expect(identity).toEqual({ name: 'DUO CAPITAL', slogan: 'Ensemble, plus loin !', currencyCode: 'XOF', currencyLabel: 'FCFA (XOF)', timeZone: 'Africa/Dakar' })
      expect(objectives).toEqual({ monthlyPerPartner: 15000, monthlyCollective: 30000, fundStartPeriod: '2026-12' })
      expect(editableFields).toEqual(['description', 'projectInfo'])
      expect(limits).toEqual({ descriptionMin: 10, descriptionMax: 300, projectInfoMax: 500 })
    })

    it('expose les deux associés réels, sans empreinte ni donnée de session', async () => {
      const res = await get(BASE)
      const { partners } = res.body.data
      expect(partners).toEqual([
        { id: String(mohamed._id), name: 'Mohamed Bakhoum', email: 'mohamed@example.com', partnerNumber: 1, status: 'ACTIVE' },
        { id: String(cheikh._id), name: 'Cheikh Sow', email: 'cheikh@example.com', partnerNumber: 2, status: 'ACTIVE' },
      ])
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2|refreshToken/i)
    })

    it('Mohamed et Cheikh lisent exactement les mêmes informations', async () => {
      const a = await get(BASE, cookieMohamed)
      const b = await get(BASE, cookieCheikh)
      expect(a.status).toBe(200)
      expect(stripTime(a.body)).toEqual(stripTime(b.body))
    })

    it('une lecture n’écrit RIEN en base (ni document, ni audit)', async () => {
      await get(BASE)
      await get(BASE, cookieCheikh)
      expect(await FundSettings.collection.countDocuments()).toBe(0)
      expect(await AuditLog.collection.countDocuments({ resourceType: 'SETTINGS' })).toBe(0)
    })

    it('les objectifs suivent FUND_START_PERIOD de la configuration (pas de seconde source)', async () => {
      const other = makeApp(withAuth(buildTestConfig({ FUND_START_PERIOD: '2027-03' }), authPatch))
      const cookie = await login(mohamed, other)
      expect((await get(BASE, cookie, other)).body.data.objectives.fundStartPeriod).toBe('2027-03')
      const without = makeApp(withAuth(buildTestConfig(), authPatch))
      const cookieWithout = await login(mohamed, without)
      expect((await get(BASE, cookieWithout, without)).body.data.objectives.fundStartPeriod).toBeNull()
    })
  })

  describe('PUT /settings : modification des paramètres communs', () => {
    const body = (overrides = {}) => ({ expectedVersion: 0, description: 'Fonds commun de Mohamed et Cheikh', projectInfo: 'Financer de petites activités', ...overrides })

    it('enregistre une modification valide (version 1), nettoie les textes et la renvoie', async () => {
      const res = await put(BASE, body({ description: '  Fonds   commun de Mohamed et Cheikh  ', projectInfo: '  Financer   de petites activités ' }))
      expect(res.status).toBe(200)
      expect(res.body.data.changed).toBe(true)
      expect(res.body.data.fund).toMatchObject({ description: 'Fonds commun de Mohamed et Cheikh', projectInfo: 'Financer de petites activités', version: 1, isDefault: false })
      expect(res.body.data.fund.updatedBy).toEqual({ id: String(mohamed._id), name: 'Mohamed Bakhoum', partnerNumber: 1 })
    })

    it('persiste dans MongoDB (un seul document, identifiant fixe, version 1)', async () => {
      await put(BASE, body())
      const documents = await FundSettings.collection.find({}).toArray()
      expect(documents).toHaveLength(1)
      expect(String(documents[0]._id)).toBe('66756e642d73657474696e67')
      expect(documents[0]).toMatchObject({ description: 'Fonds commun de Mohamed et Cheikh', projectInfo: 'Financer de petites activités', version: 1 })
      expect(String(documents[0].updatedBy)).toBe(String(mohamed._id))
    })

    it('une modification de Mohamed est visible par Cheikh, et inversement', async () => {
      await put(BASE, body({ description: 'Description écrite par Mohamed' }), cookieMohamed)
      const seenByCheikh = (await get(BASE, cookieCheikh)).body.data.fund
      expect(seenByCheikh).toMatchObject({ description: 'Description écrite par Mohamed', version: 1 })
      expect(seenByCheikh.updatedBy.name).toBe('Mohamed Bakhoum')

      const res = await put(BASE, { expectedVersion: 1, description: 'Description réécrite par Cheikh' }, cookieCheikh)
      expect(res.status).toBe(200)
      expect(res.body.data.fund).toMatchObject({ version: 2, projectInfo: 'Financer de petites activités' }) // champ non envoyé : conservé
      const seenByMohamed = (await get(BASE, cookieMohamed)).body.data.fund
      expect(seenByMohamed).toMatchObject({ description: 'Description réécrite par Cheikh', version: 2 })
      expect(seenByMohamed.updatedBy.name).toBe('Cheikh Sow')
    })

    it('les données persistent après déconnexion et reconnexion', async () => {
      await put(BASE, body())
      await Session.updateMany({ user: mohamed._id }, { $set: { revokedAt: new Date(), revokedReason: 'LOGOUT' } })
      expect((await get(BASE, cookieMohamed)).status).toBe(401)
      const again = await login(mohamed)
      expect((await get(BASE, again)).body.data.fund).toMatchObject({ description: 'Fonds commun de Mohamed et Cheikh', version: 1 })
    })

    it('permet de vider les informations du projet (facultatives)', async () => {
      const res = await put(BASE, body({ projectInfo: '' }))
      expect(res.status).toBe(200)
      expect(res.body.data.fund.projectInfo).toBe('')
    })

    it('refuse un champ non autorisé ou inconnu (400) sans rien écrire', async () => {
      for (const extra of [{ name: 'AUTRE' }, { slogan: 'x' }, { currencyCode: 'EUR' }, { monthlyTarget: 20000 }, { fundStartPeriod: '2020-01' }, { partners: [] }, { version: 5 }, { updatedBy: String(cheikh._id) }, { userId: String(cheikh._id) }]) {
        const res = await put(BASE, body(extra))
        expect([Object.keys(extra)[0], res.status, res.body.error.code]).toEqual([Object.keys(extra)[0], 400, 'VALIDATION_ERROR'])
      }
      expect(await FundSettings.collection.countDocuments()).toBe(0)
      expect(await audits()).toHaveLength(0)
    })

    it('applique les limites de longueur (côté serveur aussi)', async () => {
      expect((await put(BASE, body({ description: 'court' }))).status).toBe(400)
      expect((await put(BASE, body({ description: 'a'.repeat(301) }))).status).toBe(400)
      expect((await put(BASE, body({ projectInfo: 'b'.repeat(501) }))).status).toBe(400)
      expect((await put(BASE, { description: 'Une description valide' })).status).toBe(400) // version attendue obligatoire
      expect((await put(BASE, { expectedVersion: 0 })).status).toBe(400) // rien à modifier
      expect((await put(BASE, body({ description: 'a'.repeat(300) }))).status).toBe(200)
    })

    it('le nom, le slogan, la devise et les objectifs restent inchangés après une modification', async () => {
      await put(BASE, body())
      const { identity, objectives } = (await get(BASE)).body.data
      expect(identity).toMatchObject({ name: 'DUO CAPITAL', slogan: 'Ensemble, plus loin !', currencyCode: 'XOF' })
      expect(objectives).toMatchObject({ monthlyPerPartner: 15000, monthlyCollective: 30000 })
    })

    it('CONFLIT : une version périmée est refusée (409) et ne remplace rien', async () => {
      expect((await put(BASE, body({ description: 'Première version écrite' }), cookieMohamed)).status).toBe(200)
      const stale = await put(BASE, body({ description: 'Écrasement silencieux interdit' }), cookieCheikh) // Cheikh avait lu la version 0
      expect([stale.status, stale.body.error.code]).toEqual([409, 'SETTINGS_VERSION_CONFLICT'])
      const document = await FundSettings.collection.findOne({})
      expect(document).toMatchObject({ description: 'Première version écrite', version: 1 })
      expect(await audits()).toHaveLength(1)
      const retry = await put(BASE, { expectedVersion: 1, description: 'Écriture après rechargement' }, cookieCheikh)
      expect([retry.status, retry.body.data.fund.version]).toEqual([200, 2])
    })

    it('CONFLIT : une version attendue supérieure à la version courante est aussi refusée', async () => {
      const res = await put(BASE, body({ expectedVersion: 3 }))
      expect(res.status).toBe(409)
      expect(await FundSettings.collection.countDocuments()).toBe(0)
    })

    it('CONFLIT : deux premières écritures simultanées → une réussit, l’autre reçoit 409, un seul document', async () => {
      const [a, b] = await Promise.all([
        put(BASE, body({ description: 'Écriture simultanée de Mohamed' }), cookieMohamed),
        put(BASE, body({ description: 'Écriture simultanée de Cheikh' }), cookieCheikh),
      ])
      expect([a.status, b.status].sort()).toEqual([200, 409])
      expect(await FundSettings.collection.countDocuments()).toBe(1)
      expect((await FundSettings.collection.findOne({})).version).toBe(1)
      expect(await audits()).toHaveLength(1)
    })

    it('CONFLIT : deux modifications simultanées de la même version → une seule appliquée (version +1)', async () => {
      await put(BASE, body())
      const [a, b] = await Promise.all([
        put(BASE, { expectedVersion: 1, description: 'Modification A de Mohamed' }, cookieMohamed),
        put(BASE, { expectedVersion: 1, description: 'Modification B de Cheikh' }, cookieCheikh),
      ])
      expect([a.status, b.status].sort()).toEqual([200, 409])
      expect((await FundSettings.collection.findOne({})).version).toBe(2)
      expect(await audits()).toHaveLength(2)
    })

    it('une modification identique à l’état courant n’écrit rien (ni version, ni audit, ni document)', async () => {
      const first = await put(BASE, { expectedVersion: 0, description: DEFAULT_DESCRIPTION, projectInfo: DEFAULT_PROJECT_INFO })
      expect([first.status, first.body.data.changed, first.body.data.fund.version]).toEqual([200, false, 0])
      expect(await FundSettings.collection.countDocuments()).toBe(0)
      await put(BASE, body())
      const same = await put(BASE, { expectedVersion: 1, description: 'Fonds commun de Mohamed et Cheikh' })
      expect([same.status, same.body.data.changed, same.body.data.fund.version]).toEqual([200, false, 1])
      expect((await FundSettings.collection.findOne({})).version).toBe(1)
      expect(await audits()).toHaveLength(1)
    })

    it('JOURNAL D’AUDIT : chaque modification réussie est enregistrée (auteur, action, ressource, date, avant/après)', async () => {
      await put(BASE, body({ description: 'Description de Mohamed' }), cookieMohamed)
      await put(BASE, { expectedVersion: 1, projectInfo: 'Informations de Cheikh' }, cookieCheikh)
      const entries = await audits()
      expect(entries).toHaveLength(2)
      expect(entries[0]).toMatchObject({ action: 'SETTINGS_UPDATED', resourceType: 'SETTINGS', actorType: 'USER', actorName: 'Mohamed Bakhoum' })
      expect(String(entries[0].actor)).toBe(String(mohamed._id))
      expect(String(entries[0].resourceId)).toBe('66756e642d73657474696e67')
      expect(entries[0].occurredAt).toBeInstanceOf(Date)
      expect(entries[0].before).toEqual({ description: DEFAULT_DESCRIPTION, projectInfo: DEFAULT_PROJECT_INFO, version: 0 })
      expect(entries[0].after).toEqual({ description: 'Description de Mohamed', projectInfo: 'Financer de petites activités', version: 1 })
      expect(String(entries[1].actor)).toBe(String(cheikh._id))
      expect(entries[1].before).toMatchObject({ description: 'Description de Mohamed', version: 1 })
      expect(entries[1].after).toMatchObject({ description: 'Description de Mohamed', projectInfo: 'Informations de Cheikh', version: 2 })
    })

    it('JOURNAL D’AUDIT : aucun secret, et aucune entrée pour un refus (400, 409) ou une lecture', async () => {
      await get(BASE)
      await put(BASE, body({ name: 'x' }))
      await put(BASE, body({ expectedVersion: 7 }))
      expect(await audits()).toHaveLength(0)
      await put(BASE, body())
      expect(JSON.stringify(await audits())).not.toMatch(/password|token|secret|cookie|hash/i)
    })

    it('ne touche à aucune donnée financière', async () => {
      await addContribution(mohamed, 15000, '2026-12-05')
      const before = await financialSnapshot()
      await put(BASE, body())
      await put(BASE, { expectedVersion: 1, description: 'Seconde modification valide' }, cookieCheikh)
      expect(await financialSnapshot()).toEqual(before)
    })
  })

  describe('préférences personnelles', () => {
    const PREFS = `${BASE}/preferences`
    const defaults = { theme: 'light', amountSeparator: 'space', visualNotificationsEnabled: true, contributionRemindersEnabled: true }

    it('renvoie les valeurs par défaut sans rien écrire', async () => {
      const res = await get(PREFS)
      expect(res.status).toBe(200)
      expect(res.body.data.preferences).toMatchObject({ ...defaults, isDefault: true, updatedAt: null })
      expect(await UserPreferences.collection.countDocuments()).toBe(0)
    })

    it('indique que les notifications par email ne sont pas disponibles', async () => {
      const { emailNotifications } = (await get(PREFS)).body.data.preferences
      expect(emailNotifications).toEqual({ available: false, enabled: false })
    })

    it('enregistre une modification, la relit et la conserve (MongoDB, lié à l’utilisateur de la session)', async () => {
      const res = await put(PREFS, { theme: 'dark', amountSeparator: 'dot' })
      expect(res.status).toBe(200)
      expect(res.body.data.preferences).toMatchObject({ theme: 'dark', amountSeparator: 'dot', visualNotificationsEnabled: true, contributionRemindersEnabled: true, isDefault: false })
      expect((await get(PREFS)).body.data.preferences).toMatchObject({ theme: 'dark', amountSeparator: 'dot' })
      const documents = await UserPreferences.collection.find({}).toArray()
      expect(documents).toHaveLength(1)
      expect(String(documents[0].user)).toBe(String(mohamed._id))
    })

    it('une modification partielle conserve les autres préférences', async () => {
      await put(PREFS, { theme: 'dark', amountSeparator: 'none', visualNotificationsEnabled: false })
      await put(PREFS, { contributionRemindersEnabled: false })
      expect((await get(PREFS)).body.data.preferences).toMatchObject({ theme: 'dark', amountSeparator: 'none', visualNotificationsEnabled: false, contributionRemindersEnabled: false })
    })

    it('les trois formats de montant et les deux thèmes sont acceptés', async () => {
      for (const amountSeparator of ['space', 'dot', 'none']) expect((await put(PREFS, { amountSeparator })).status).toBe(200)
      for (const theme of ['dark', 'light']) expect((await put(PREFS, { theme })).status).toBe(200)
    })

    it('refuse un format, un thème ou un booléen invalide (400) sans rien écrire', async () => {
      for (const invalid of [{ amountSeparator: 'comma' }, { theme: 'blue' }, { visualNotificationsEnabled: 'oui' }, { contributionRemindersEnabled: 1 }, {}]) {
        const res = await put(PREFS, invalid)
        expect([JSON.stringify(invalid), res.status]).toEqual([JSON.stringify(invalid), 400])
      }
      expect(await UserPreferences.collection.countDocuments()).toBe(0)
    })

    it('ISOLATION : Mohamed et Cheikh ont des préférences indépendantes', async () => {
      await put(PREFS, { theme: 'dark', amountSeparator: 'dot', visualNotificationsEnabled: false }, cookieMohamed)
      expect((await get(PREFS, cookieCheikh)).body.data.preferences).toMatchObject({ ...defaults, isDefault: true })
      await put(PREFS, { theme: 'light', amountSeparator: 'none', contributionRemindersEnabled: false }, cookieCheikh)
      expect((await get(PREFS, cookieMohamed)).body.data.preferences).toMatchObject({ theme: 'dark', amountSeparator: 'dot', visualNotificationsEnabled: false, contributionRemindersEnabled: true })
      expect((await get(PREFS, cookieCheikh)).body.data.preferences).toMatchObject({ theme: 'light', amountSeparator: 'none', visualNotificationsEnabled: true, contributionRemindersEnabled: false })
      expect(await UserPreferences.collection.countDocuments()).toBe(2)
    })

    it('IMPOSSIBLE de modifier les préférences d’un autre : aucun identifiant n’est accepté et le propriétaire vient de la session', async () => {
      for (const extra of [{ userId: String(cheikh._id) }, { user: String(cheikh._id) }, { _id: String(cheikh._id) }, { partnerNumber: 2 }]) {
        const res = await put(PREFS, { theme: 'dark', ...extra })
        expect([Object.keys(extra)[0], res.status]).toEqual([Object.keys(extra)[0], 400])
      }
      expect(await UserPreferences.collection.countDocuments()).toBe(0)
      await put(PREFS, { theme: 'dark' }, cookieMohamed)
      expect(await UserPreferences.collection.countDocuments({ user: cheikh._id })).toBe(0)
      expect(await UserPreferences.collection.countDocuments({ user: mohamed._id })).toBe(1)
    })

    it('refuse toute préférence d’email (fonctionnalité non disponible)', async () => {
      for (const emailField of [{ emailNotificationsEnabled: true }, { emailNotifications: true }, { emailNotifications: { enabled: true } }]) {
        expect((await put(PREFS, { theme: 'dark', ...emailField })).status).toBe(400)
      }
      expect(await UserPreferences.collection.countDocuments()).toBe(0)
    })

    it('persiste après déconnexion et reconnexion (et sur un autre appareil)', async () => {
      await put(PREFS, { theme: 'dark', amountSeparator: 'dot' })
      await Session.updateMany({ user: mohamed._id }, { $set: { revokedAt: new Date(), revokedReason: 'LOGOUT' } })
      const otherDevice = await login(mohamed)
      expect((await get(PREFS, otherDevice)).body.data.preferences).toMatchObject({ theme: 'dark', amountSeparator: 'dot' })
    })

    it('des modifications répétées ou simultanées ne créent jamais plus d’un document par associé', async () => {
      await Promise.all([put(PREFS, { theme: 'dark' }), put(PREFS, { amountSeparator: 'dot' }), put(PREFS, { visualNotificationsEnabled: false })])
      await put(PREFS, { theme: 'light' })
      expect(await UserPreferences.collection.countDocuments({ user: mohamed._id })).toBe(1)
      const final = (await get(PREFS)).body.data.preferences
      expect(final).toMatchObject({ theme: 'light', amountSeparator: 'dot', visualNotificationsEnabled: false })
    })

    it('la modification des préférences n’écrit pas dans le journal d’audit', async () => {
      await put(PREFS, { theme: 'dark' })
      await post(`${PREFS}/reset`)
      expect(await audits()).toHaveLength(0)
    })

    describe('POST /settings/preferences/reset', () => {
      it('remet UNIQUEMENT les préférences de l’associé connecté aux valeurs par défaut', async () => {
        await put(PREFS, { theme: 'dark', amountSeparator: 'dot', visualNotificationsEnabled: false, contributionRemindersEnabled: false }, cookieMohamed)
        await put(PREFS, { theme: 'dark', amountSeparator: 'none' }, cookieCheikh)
        const res = await post(`${PREFS}/reset`, {}, cookieMohamed)
        expect(res.status).toBe(200)
        expect(res.body.data.preferences).toMatchObject(defaults)
        expect((await get(PREFS, cookieMohamed)).body.data.preferences).toMatchObject(defaults)
        expect((await get(PREFS, cookieCheikh)).body.data.preferences).toMatchObject({ theme: 'dark', amountSeparator: 'none' }) // Cheikh inchangé
        expect(await UserPreferences.collection.countDocuments()).toBe(2) // aucun document supprimé
      })

      it('ne modifie JAMAIS les paramètres communs ni le journal d’audit', async () => {
        await put(BASE, { expectedVersion: 0, description: 'Description commune conservée' })
        await put(PREFS, { theme: 'dark' })
        const fundBefore = await FundSettings.collection.findOne({})
        const auditBefore = await audits()
        await post(`${PREFS}/reset`)
        expect(await FundSettings.collection.findOne({})).toEqual(fundBefore)
        expect(await audits()).toEqual(auditBefore)
        expect((await get(BASE)).body.data.fund).toMatchObject({ description: 'Description commune conservée', version: 1 })
      })

      it('sans préférences enregistrées : renvoie les valeurs par défaut sans rien écrire', async () => {
        const res = await post(`${PREFS}/reset`)
        expect(res.status).toBe(200)
        expect(res.body.data.preferences).toMatchObject({ ...defaults, isDefault: true })
        expect(await UserPreferences.collection.countDocuments()).toBe(0)
      })

      it('refuse un corps non vide (aucun identifiant accepté)', async () => {
        expect((await post(`${PREFS}/reset`, { userId: String(cheikh._id) })).status).toBe(400)
      })

      it('ne touche à aucune donnée financière', async () => {
        await addContribution(mohamed, 15000, '2026-12-05')
        await put(PREFS, { theme: 'dark' })
        const before = await financialSnapshot()
        await post(`${PREFS}/reset`)
        expect(await financialSnapshot()).toEqual(before)
      })
    })
  })

  describe('GET /settings/contribution-reminders', () => {
    const REMINDERS = `${BASE}/contribution-reminders`
    const rowOf = (data, period, partner) => data.months.find((month) => month.period === period).partners.find((entry) => entry.partnerNumber === partner)

    it('mois courant sans versement : les deux associés « à compléter »', async () => {
      const res = await get(REMINDERS)
      expect(res.status).toBe(200)
      expect(res.headers['cache-control']).toBe('no-store')
      const data = res.body.data
      expect(data).toMatchObject({ enabled: true, available: true, asOf: '2026-12-20', currentPeriod: '2026-12', fundStartPeriod: '2026-12', monthlyTargetPerPartner: 15000, monthlyTargetCollective: 30000, pendingCount: 2, currency: 'XOF', timeZone: 'Africa/Dakar' })
      expect(data.months.map((month) => month.period)).toEqual(['2026-12'])
      expect(rowOf(data, '2026-12', 1)).toMatchObject({ partnerId: String(mohamed._id), name: 'Mohamed Bakhoum', monthlyTarget: 15000, paid: 0, remaining: 15000, progressPercent: 0, status: 'TO_COMPLETE' })
      expect(rowOf(data, '2026-12', 2)).toMatchObject({ partnerId: String(cheikh._id), name: 'Cheikh Sow', status: 'TO_COMPLETE' })
    })

    it('situation des deux associés : mêmes données pour Mohamed et Cheikh quand les rappels sont activés', async () => {
      await addContribution(mohamed, 15000, '2026-12-05')
      const a = await get(REMINDERS, cookieMohamed)
      const b = await get(REMINDERS, cookieCheikh)
      expect(stripTime(a.body)).toEqual(stripTime(b.body))
      expect(rowOf(a.body.data, '2026-12', 1).status).toBe('ACHIEVED')
      expect(rowOf(a.body.data, '2026-12', 2).status).toBe('TO_COMPLETE')
    })

    it('mois précédents incomplets : courant d’abord, puis du plus récent au plus ancien', async () => {
      clockValue = new Date('2027-02-10T10:00:00.000Z')
      await addContribution(mohamed, 15000, '2026-12-05')
      await addContribution(cheikh, 15000, '2026-12-06') // décembre complet : pas de rappel
      await addContribution(mohamed, 15000, '2027-01-05')
      await addContribution(cheikh, 5000, '2027-01-06') // janvier incomplet
      const data = (await get(REMINDERS)).body.data
      expect(data.months.map((month) => month.period)).toEqual(['2027-02', '2027-01'])
      expect(rowOf(data, '2027-01', 2)).toMatchObject({ paid: 5000, remaining: 10000, status: 'TO_COMPLETE' })
      expect(rowOf(data, '2027-01', 1).status).toBe('ACHIEVED')
      expect(data.months[1]).toMatchObject({ isCurrent: false, isOverdue: true })
    })

    it('objectif atteint, objectif non atteint, montant restant correct', async () => {
      await addContribution(mohamed, 15000, '2026-12-05')
      await addContribution(cheikh, 6000, '2026-12-06')
      const data = (await get(REMINDERS)).body.data
      expect(rowOf(data, '2026-12', 1)).toMatchObject({ paid: 15000, remaining: 0, progressPercent: 100, status: 'ACHIEVED' })
      expect(rowOf(data, '2026-12', 2)).toMatchObject({ paid: 6000, remaining: 9000, progressPercent: 40, status: 'TO_COMPLETE' })
      expect(data.pendingCount).toBe(1)
    })

    it('additionne les cotisations multiples du même mois', async () => {
      await addContribution(mohamed, 5000, '2026-12-02')
      await addContribution(mohamed, 4000, '2026-12-09')
      await addContribution(mohamed, 6000, '2026-12-15')
      expect(rowOf((await get(REMINDERS)).body.data, '2026-12', 1)).toMatchObject({ paid: 15000, remaining: 0, status: 'ACHIEVED' })
    })

    it('pourcentage plafonné à 100 % mais montant versé jamais plafonné', async () => {
      await addContribution(mohamed, 40000, '2026-12-05')
      const row = rowOf((await get(REMINDERS)).body.data, '2026-12', 1)
      expect(row).toMatchObject({ paid: 40000, remaining: 0, progressPercent: 100, status: 'ACHIEVED' })
    })

    it('exclut les cotisations supprimées logiquement', async () => {
      await addContribution(mohamed, 15000, '2026-12-05', { deletedAt: new Date(), deletedBy: mohamed._id })
      expect(rowOf((await get(REMINDERS)).body.data, '2026-12', 1)).toMatchObject({ paid: 0, status: 'TO_COMPLETE' })
    })

    it('exclut les cotisations futures (date après aujourd’hui)', async () => {
      await addContribution(mohamed, 15000, '2026-12-28') // 8 jours après « aujourd’hui »
      expect(rowOf((await get(REMINDERS)).body.data, '2026-12', 1)).toMatchObject({ paid: 0, status: 'TO_COMPLETE' })
    })

    it('respecte le début du fonds : aucun rappel avant FUND_START_PERIOD', async () => {
      const early = makeApp(withAuth(buildTestConfig({ FUND_START_PERIOD: '2027-02' }), authPatch))
      const cookie = await login(mohamed, early)
      const data = (await get(REMINDERS, cookie, early)).body.data
      expect(data).toMatchObject({ enabled: true, available: false, months: [], pendingCount: 0 })
      expect(data.unavailableReason).toMatch(/pas encore démarré/)
    })

    it('FUND_START_PERIOD absent : aucun rappel inventé', async () => {
      const none = makeApp(withAuth(buildTestConfig(), authPatch))
      const cookie = await login(mohamed, none)
      const data = (await get(REMINDERS, cookie, none)).body.data
      expect(data).toMatchObject({ available: false, months: [], pendingCount: 0 })
      expect(data.unavailableReason).toMatch(/FUND_START_PERIOD/)
    })

    it('les cotisations d’avant le début du fonds ne créent aucun rappel', async () => {
      await addContribution(mohamed, 15000, '2026-10-05')
      const data = (await get(REMINDERS)).body.data
      expect(data.months.map((month) => month.period)).toEqual(['2026-12'])
      expect(rowOf(data, '2026-12', 1).paid).toBe(0)
    })

    it('fuseau Dakar : le mois courant suit la date métier (31 décembre 23:59 → 1er janvier 00:00)', async () => {
      clockValue = new Date('2026-12-31T23:59:59.000Z')
      let data = (await get(REMINDERS)).body.data
      expect([data.asOf, data.currentPeriod]).toEqual(['2026-12-31', '2026-12'])
      clockValue = new Date('2027-01-01T00:00:00.000Z')
      data = (await get(REMINDERS)).body.data
      expect([data.asOf, data.currentPeriod]).toEqual(['2027-01-01', '2027-01'])
      expect(data.months.map((month) => month.period)).toEqual(['2027-01', '2026-12']) // décembre devient un mois passé impayé
    })

    it('PRÉFÉRENCE DÉSACTIVÉE : les rappels sont masqués pour cet associé seulement', async () => {
      await put(`${BASE}/preferences`, { contributionRemindersEnabled: false }, cookieMohamed)
      const mine = (await get(REMINDERS, cookieMohamed)).body.data
      expect(mine).toMatchObject({ enabled: false, months: [], pendingCount: 0 })
      const theirs = (await get(REMINDERS, cookieCheikh)).body.data
      expect(theirs).toMatchObject({ enabled: true, available: true, pendingCount: 2 })
      expect(theirs.months).toHaveLength(1)
    })

    it('PRÉFÉRENCE : réactiver ramène les rappels, les cotisations restent inchangées', async () => {
      await addContribution(mohamed, 7000, '2026-12-05')
      const before = await financialSnapshot()
      await put(`${BASE}/preferences`, { contributionRemindersEnabled: false })
      expect((await get(REMINDERS)).body.data.enabled).toBe(false)
      await put(`${BASE}/preferences`, { contributionRemindersEnabled: true })
      const data = (await get(REMINDERS)).body.data
      expect(data.enabled).toBe(true)
      expect(rowOf(data, '2026-12', 1)).toMatchObject({ paid: 7000, remaining: 8000 })
      expect(await financialSnapshot()).toEqual(before)
    })

    it('la préférence « notifications visuelles » ne change pas les données de rappel (elle ne pilote que l’affichage)', async () => {
      const before = (await get(REMINDERS)).body.data
      await put(`${BASE}/preferences`, { visualNotificationsEnabled: false })
      expect(stripTime((await get(REMINDERS)).body)).toEqual(stripTime({ data: before }))
    })

    it('AUCUNE ÉCRITURE FINANCIÈRE : consulter les rappels ne crée ni ne modifie aucune cotisation, opération ou retrait', async () => {
      await addContribution(mohamed, 5000, '2026-12-05')
      const before = await financialSnapshot()
      for (let index = 0; index < 3; index += 1) {
        await get(REMINDERS, cookieMohamed)
        await get(REMINDERS, cookieCheikh)
      }
      expect(await financialSnapshot()).toEqual(before)
      expect(await Contribution.collection.countDocuments()).toBe(1)
    })
  })

  describe('GET /settings/security', () => {
    const SECURITY = `${BASE}/security`

    it('renvoie les informations réelles du compte et de la session courante', async () => {
      const res = await get(SECURITY)
      expect(res.status).toBe(200)
      expect(res.headers['cache-control']).toBe('no-store')
      const { account, authentication, sessions } = res.body.data
      expect(account).toMatchObject({ name: 'Mohamed Bakhoum', email: 'mohamed@example.com', partnerNumber: 1, status: 'ACTIVE', passwordProtected: true, mustChangePassword: false })
      expect(authentication).toMatchObject({ method: 'EMAIL_PASSWORD', cookies: 'HTTP_ONLY', passwordChangeApiAvailable: true })
      expect(authentication.accessTokenMinutes).toBe(Math.round(config.auth.accessTokenTtlSeconds / 60))
      expect(authentication.refreshTokenDays).toBe(Math.round(config.auth.refreshTokenTtlSeconds / 86400))
      expect(sessions.activeCount).toBeGreaterThanOrEqual(1)
      expect(sessions.items.filter((item) => item.current)).toHaveLength(1)
    })

    it('ne liste QUE ses propres sessions actives (ni celles de l’autre associé, ni les sessions révoquées)', async () => {
      const second = await login(mohamed)
      expect(second).toBeTruthy()
      await Session.updateOne({ user: mohamed._id }, { $set: { revokedAt: new Date(), revokedReason: 'MANUAL' } }) // révoque une session de Mohamed… elle reste exclue de la liste
      const data = (await get(SECURITY, second)).body.data
      const active = await Session.countDocuments({ user: mohamed._id, revokedAt: null })
      expect(data.sessions.activeCount).toBe(active)
      const cheikhData = (await get(SECURITY, cookieCheikh)).body.data
      expect(cheikhData.account.email).toBe('cheikh@example.com')
      expect(cheikhData.sessions.activeCount).toBe(await Session.countDocuments({ user: cheikh._id, revokedAt: null }))
    })

    it('N’EXPOSE JAMAIS mot de passe, empreinte, access token, refresh token ni secret', async () => {
      const refreshToken = decodeURIComponent(cookieMohamed.match(/dc_refresh=([^;]+)/)[1])
      const accessToken = decodeURIComponent(cookieMohamed.match(/dc_access=([^;]+)/)[1])
      const stored = await Session.find({ user: mohamed._id }).select('+refreshTokenHash').lean()
      const userWithHash = await User.findById(mohamed._id).select('+passwordHash').lean()
      const serialized = JSON.stringify((await get(SECURITY)).body)
      expect(serialized).not.toContain(refreshToken)
      expect(serialized).not.toContain(accessToken)
      expect(serialized).not.toContain(userWithHash.passwordHash)
      for (const session of stored) expect(serialized).not.toContain(session.refreshTokenHash)
      expect(serialized).not.toContain(TEST_PASSWORD)
      expect(serialized).not.toMatch(/passwordHash|refreshTokenHash|jwtSecret|familyId|failedLoginAttempts|lockedUntil/)
      expect(serialized).not.toContain(config.auth.jwtSecret)
    })

    it('une session révoquée n’obtient plus rien (401)', async () => {
      await Session.updateMany({ user: mohamed._id }, { $set: { revokedAt: new Date(), revokedReason: 'LOGOUT' } })
      expect((await get(SECURITY, cookieMohamed)).status).toBe(401)
    })
  })

  describe('non-régression : aucune écriture financière', () => {
    it('une séquence complète d’appels Paramètres laisse les données financières strictement identiques', async () => {
      await addContribution(mohamed, 15000, '2026-12-05')
      await addContribution(cheikh, 9000, '2026-12-06')
      const before = await financialSnapshot()
      await get(BASE, cookieMohamed)
      await put(BASE, { expectedVersion: 0, description: 'Description pour le test complet' }, cookieMohamed)
      await put(BASE, { expectedVersion: 1, projectInfo: 'Informations pour le test complet' }, cookieCheikh)
      await put(`${BASE}/preferences`, { theme: 'dark', amountSeparator: 'dot', visualNotificationsEnabled: false, contributionRemindersEnabled: false }, cookieMohamed)
      await get(`${BASE}/contribution-reminders`, cookieMohamed)
      await get(`${BASE}/contribution-reminders`, cookieCheikh)
      await get(`${BASE}/security`, cookieCheikh)
      await post(`${BASE}/preferences/reset`, {}, cookieMohamed)
      expect(await financialSnapshot()).toEqual(before)
      expect(await Contribution.collection.countDocuments()).toBe(2)
      expect(await BusinessOperation.collection.countDocuments()).toBe(0)
      expect(await Withdrawal.collection.countDocuments()).toBe(0)
    })
  })
})
