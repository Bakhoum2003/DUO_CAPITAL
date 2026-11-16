import { readFileSync } from 'node:fs'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import defaultEntry, { createApp } from '../../src/app.js'
import { ConfigError } from '../../src/config/env.js'
import { createServerlessEntry } from '../../src/serverless.js'
import { createLogger } from '../../src/utils/logger.js'
import { createFakeDatabase } from '../helpers/fakeDatabase.js'
import { TEST_DATABASE_URL, TEST_JWT_SECRET, buildTestConfig } from '../helpers/testConfig.js'

const DB_SECRET = 'Sup3rS3cretDuoPassword'
const LEAKY_URI = `mongodb+srv://admin:${DB_SECRET}@cluster0.example.net/duo_capital`

function setup({ database = createFakeDatabase(), loadConfig = () => buildTestConfig() } = {}) {
  const lines = []
  const destination = { write: (chunk) => lines.push(String(chunk)) }
  const loadConfigSpy = vi.fn(loadConfig)
  const buildAppSpy = vi.fn(createApp)
  // La configuration de test coupe les journaux : on les rouvre pour vérifier ce qui est (ou n'est pas) écrit.
  const makeLogger = vi.fn(({ level, environment }) => createLogger({ level: level === 'silent' ? 'info' : level, environment, destination }))
  const entry = createServerlessEntry({ createApp: buildAppSpy, loadConfig: loadConfigSpy, createLogger: makeLogger, database })
  return { entry, database, lines, loadConfigSpy, buildAppSpy, makeLogger, logs: () => lines.join('') }
}

function slowDatabase(delayMs = 30) {
  const database = createFakeDatabase()
  const connect = database.connect
  database.connect = async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    return connect()
  }
  return database
}

function failingDatabase(error, failures = Infinity) {
  const database = createFakeDatabase()
  let attempts = 0
  database.connect = async () => {
    database.events.push('connect')
    attempts += 1
    if (attempts <= failures) throw error
  }
  return database
}

describe('export par défaut de src/app.js (détection Express de Vercel)', () => {
  it('est une application Express (fonction), et createApp reste exporté', () => {
    expect(typeof defaultEntry).toBe('function')
    expect(typeof defaultEntry.handle).toBe('function')
    expect(typeof defaultEntry.use).toBe('function')
    expect(typeof defaultEntry.listen).toBe('function')
    expect(typeof createApp).toBe('function')
  })

  it('le module déclare bien les deux exports, sans lire l’environnement ni ouvrir de connexion', () => {
    const source = readFileSync(new URL('../../src/app.js', import.meta.url), 'utf8')
    expect(source).toContain('export function createApp(')
    expect(source).toContain('export default createServerlessEntry({ createApp })')
    expect(/process\.env|parseEnv\(|loadDotenv\(|connectDatabase\(|mongoose/.test(source)).toBe(false)
  })

  it('le démarrage local reste dans server.js (aucun export par défaut, écoute inchangée)', () => {
    const source = readFileSync(new URL('../../src/server.js', import.meta.url), 'utf8')
    expect(source).toContain('export async function startServer(')
    expect(source).toContain('server.listen(port')
    expect(/export default/.test(source)).toBe(false)
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
    expect(pkg.scripts.start).toBe('node src/server.js')
    expect(pkg.scripts.dev).toBe('node --watch src/server.js')
  })
})

describe('initialisation paresseuse et mise en cache', () => {
  it('ne lit pas la configuration, ne se connecte pas et ne construit rien avant la première requête', () => {
    const { database, loadConfigSpy, buildAppSpy, makeLogger } = setup()
    expect(loadConfigSpy).not.toHaveBeenCalled()
    expect(buildAppSpy).not.toHaveBeenCalled()
    expect(makeLogger).not.toHaveBeenCalled()
    expect(database.events).toEqual([])
  })

  it('la première requête initialise une fois, puis la vraie application répond (santé, 404, JSON)', async () => {
    const { entry, database, loadConfigSpy, buildAppSpy } = setup()
    const health = await request(entry).get('/api/health')
    expect(health.status).toBe(200)
    expect(health.body.data).toMatchObject({ status: 'ok', database: { status: 'connected' } })
    const missing = await request(entry).get('/api/v1/inconnu')
    expect(missing.status).toBe(404)
    expect(missing.body.error.code).toBeDefined()
    expect(loadConfigSpy).toHaveBeenCalledTimes(1)
    expect(buildAppSpy).toHaveBeenCalledTimes(1)
    expect(database.events).toEqual(['connect'])
  })

  it('des requêtes simultanées partagent une seule initialisation et une seule connexion', async () => {
    const { entry, database, loadConfigSpy, buildAppSpy } = setup({ database: slowDatabase() })
    const responses = await Promise.all(Array.from({ length: 8 }, () => request(entry).get('/api/health')))
    expect(responses.map((res) => res.status)).toEqual(Array(8).fill(200))
    expect(database.events).toEqual(['connect'])
    expect(loadConfigSpy).toHaveBeenCalledTimes(1)
    expect(buildAppSpy).toHaveBeenCalledTimes(1)
  })

  it('les requêtes suivantes réutilisent la connexion : aucune nouvelle connexion', async () => {
    const { entry, database, buildAppSpy } = setup()
    for (let index = 0; index < 5; index += 1) expect((await request(entry).get('/api/health')).status).toBe(200)
    expect(database.events).toEqual(['connect'])
    expect(buildAppSpy).toHaveBeenCalledTimes(1)
  })

  it('transmet à la base les réglages de configuration (adresse, réplica, taille du pool)', async () => {
    const database = createFakeDatabase()
    const connect = vi.spyOn(database, 'connect')
    const { entry } = setup({ database, loadConfig: () => buildTestConfig({ MONGO_MAX_POOL_SIZE: '5' }) })
    await request(entry).get('/api/health')
    expect(connect).toHaveBeenCalledTimes(1)
    const options = connect.mock.calls[0][0]
    expect(options).toMatchObject({ url: TEST_DATABASE_URL, requireReplicaSet: false, maxPoolSize: 5 })
  })
})

describe('aucune déconnexion après une requête', () => {
  it('ni après un succès, ni après un 404, un 503 de santé ou une erreur 500', async () => {
    const { entry, database } = setup()
    await request(entry).get('/api/health')
    await request(entry).get('/api/v1/inconnu')
    database.health = { status: 'disconnected', transactions: null }
    expect((await request(entry).get('/api/health')).status).toBe(503)
    database.checkHealth = async () => {
      throw new Error('panne simulée')
    }
    expect((await request(entry).get('/api/health')).status).toBe(500)
    expect(database.events).toEqual(['connect'])
    expect(database.events).not.toContain('disconnect')
  })

  it('même après un échec d’initialisation suivi d’une reprise, disconnect n’est jamais appelé', async () => {
    const database = failingDatabase(new Error('refusé'), 1)
    const { entry } = setup({ database })
    expect((await request(entry).get('/api/health')).status).toBe(503)
    expect((await request(entry).get('/api/health')).status).toBe(200)
    expect(database.events).not.toContain('disconnect')
  })
})

describe('erreurs d’initialisation et nouvelles tentatives', () => {
  it('base injoignable : 503 JSON générique, puis la requête suivante retente et réussit', async () => {
    const database = failingDatabase(new Error('ECONNREFUSED 10.0.0.1:27017'), 1)
    const { entry, buildAppSpy } = setup({ database })

    const failed = await request(entry).get('/api/health')
    expect(failed.status).toBe(503)
    expect(failed.headers['cache-control']).toBe('no-store')
    expect(failed.headers['retry-after']).toBe('5')
    expect(failed.body).toEqual({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Le service est momentanément indisponible.' } })
    expect(buildAppSpy).not.toHaveBeenCalled()

    const recovered = await request(entry).get('/api/health')
    expect(recovered.status).toBe(200)
    expect(database.events).toEqual(['connect', 'connect'])
    expect(buildAppSpy).toHaveBeenCalledTimes(1)

    await request(entry).get('/api/health')
    expect(database.events).toEqual(['connect', 'connect']) // la reprise est elle aussi mise en cache
  })

  it('des requêtes simultanées pendant un échec partagent la même tentative et ne journalisent qu’une erreur', async () => {
    const database = failingDatabase(new Error('refusé'))
    const slow = database.connect
    database.connect = async () => {
      await new Promise((resolve) => setTimeout(resolve, 30))
      return slow()
    }
    const { entry, lines } = setup({ database })
    const responses = await Promise.all(Array.from({ length: 5 }, () => request(entry).get('/api/health')))
    expect(responses.map((res) => res.status)).toEqual(Array(5).fill(503))
    expect(database.events).toEqual(['connect'])
    expect(lines.filter((line) => line.includes('Initialisation de l’API impossible'))).toHaveLength(1)
  })

  it('configuration invalide : 503, journal avec le nom de la variable seulement, nouvelle lecture à la requête suivante', async () => {
    let configured = false
    const loadConfig = () => {
      if (!configured) throw new ConfigError([{ variable: 'JWT_ACCESS_SECRET', message: 'est obligatoire.' }])
      return buildTestConfig()
    }
    const { entry, loadConfigSpy, logs, database } = setup({ loadConfig })

    expect((await request(entry).get('/api/health')).status).toBe(503)
    expect(logs()).toContain('JWT_ACCESS_SECRET')
    expect(database.events).toEqual([]) // pas de connexion tant que la configuration est invalide

    configured = true
    expect((await request(entry).get('/api/health')).status).toBe(200)
    expect(loadConfigSpy).toHaveBeenCalledTimes(2)
    expect(database.events).toEqual(['connect'])
  })
})

describe('aucun secret dans les journaux ni dans les réponses', () => {
  it('une erreur de connexion qui cite l’adresse de la base est masquée', async () => {
    const database = failingDatabase(new Error(`getaddrinfo ENOTFOUND ${LEAKY_URI}?retryWrites=true`))
    const { entry, logs } = setup({ database })
    const res = await request(entry).get('/api/health')

    expect(res.status).toBe(503)
    for (const text of [logs(), JSON.stringify(res.body), JSON.stringify(res.headers)]) {
      expect(text).not.toContain(DB_SECRET)
      expect(text).not.toContain('admin:')
      expect(text).not.toContain('cluster0.example.net')
    }
    expect(logs()).toContain('[MASQUÉ]')
    expect(logs()).toContain('Initialisation de l’API impossible')
  })

  it('le secret JWT et l’adresse de la base de la configuration n’apparaissent jamais', async () => {
    const { entry, logs } = setup()
    const responses = [await request(entry).get('/api/health'), await request(entry).get('/api/v1/inconnu')]
    for (const text of [logs(), ...responses.map((res) => JSON.stringify(res.body))]) {
      expect(text).not.toContain(TEST_JWT_SECRET)
      expect(text).not.toContain(TEST_DATABASE_URL)
    }
  })

  it('l’échec ne produit pas de pile d’appels dans les journaux', async () => {
    const database = failingDatabase(new Error('boom'))
    const { entry, logs } = setup({ database })
    await request(entry).get('/api/health')
    expect(logs()).not.toContain('stack')
    expect(logs()).not.toMatch(/at \S+ \(/)
  })
})
