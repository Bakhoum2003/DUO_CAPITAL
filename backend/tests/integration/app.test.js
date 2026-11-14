import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'
import { createLogger } from '../../src/utils/logger.js'
import { createFakeDatabase } from '../helpers/fakeDatabase.js'
import { FRONTEND_ORIGIN, buildTestConfig } from '../helpers/testConfig.js'

const logger = createLogger({ level: 'silent', environment: 'test' })

function build({ database = createFakeDatabase(), config = buildTestConfig() } = {}) {
  return createApp({ config, logger, database })
}

describe('GET /api/health', () => {
  it('répond 200 « ok » quand la base est connectée', async () => {
    const res = await request(build()).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      status: 'ok',
      environment: 'test',
      server: { status: 'up' },
      database: { status: 'connected', transactions: true },
    })
    expect(res.headers['cache-control']).toBe('no-store')
  })

  it('distingue serveur démarré et base non connectée : 503 « degraded »', async () => {
    const database = createFakeDatabase({ health: { status: 'disconnected', transactions: null } })
    const res = await request(build({ database })).get('/api/health')
    expect(res.status).toBe(503)
    expect(res.body.data.status).toBe('degraded')
    expect(res.body.data.server.status).toBe('up')
    expect(res.body.data.database.status).toBe('disconnected')
  })

  it('ne divulgue aucune information sensible', async () => {
    const config = buildTestConfig()
    const res = await request(build({ config })).get('/api/health')
    const text = JSON.stringify(res.body)
    expect(text).not.toContain('mongodb://')
    expect(text).not.toContain('127.0.0.1')
    expect(text).not.toContain(config.database.name)
  })

  it('renvoie une erreur 500 générique si la vérification échoue', async () => {
    const database = createFakeDatabase()
    database.checkHealth = async () => {
      throw new Error('détail interne secret')
    }
    const res = await request(build({ database })).get('/api/health')
    expect(res.status).toBe(500)
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR')
    expect(JSON.stringify(res.body)).not.toContain('secret')
  })
})

describe('routes inconnues (404)', () => {
  it.each(['/', '/api', '/api/v1', '/api/v1/inconnu', '/api/v2/x'])('GET %s -> 404 JSON', async (path) => {
    const res = await request(build()).get(path)
    expect(res.status).toBe(404)
    expect(res.headers['content-type']).toMatch(/application\/json/)
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(typeof res.body.error.message).toBe('string')
  })

  it('POST sur une route inconnue -> 404 JSON', async () => {
    const res = await request(build()).post('/api/v1/inconnu').send({ a: 1 })
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})

describe('gestion centralisée des erreurs', () => {
  it('JSON mal formé -> 400 INVALID_JSON', async () => {
    const res = await request(build())
      .post('/api/v1/inconnu')
      .set('Content-Type', 'application/json')
      .send('{"a": ')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_JSON')
  })

  it('corps trop volumineux -> 413', async () => {
    const res = await request(build())
      .post('/api/v1/inconnu')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ blob: 'x'.repeat(200 * 1024) }))
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE')
  })

  it('toutes les erreurs ont le format { error: { code, message, requestId } }', async () => {
    const res = await request(build()).get('/api/v1/inconnu')
    expect(Object.keys(res.body)).toEqual(['error'])
    expect(res.body.error.requestId).toBeTruthy()
  })
})

describe('CORS', () => {
  it('autorise le frontend configuré', async () => {
    const res = await request(build()).get('/api/health').set('Origin', FRONTEND_ORIGIN)
    expect(res.headers['access-control-allow-origin']).toBe(FRONTEND_ORIGIN)
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('refuse une origine inconnue (aucun en-tête CORS)', async () => {
    const res = await request(build()).get('/api/health').set('Origin', 'https://pirate.example.com')
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('répond à la pré-requête OPTIONS du frontend', async () => {
    const res = await request(build())
      .options('/api/v1/inconnu')
      .set('Origin', FRONTEND_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,idempotency-key')
    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe(FRONTEND_ORIGIN)
    expect(res.headers['access-control-allow-methods']).toContain('POST')
    expect(res.headers['access-control-allow-headers'].toLowerCase()).toContain('idempotency-key')
  })

  it("n'autorise pas une origine inconnue en pré-requête", async () => {
    const res = await request(build())
      .options('/api/v1/inconnu')
      .set('Origin', 'https://pirate.example.com')
      .set('Access-Control-Request-Method', 'POST')
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})

describe('sécurité HTTP de base', () => {
  it('applique les en-têtes Helmet et masque x-powered-by', async () => {
    const res = await request(build()).get('/api/health')
    expect(res.headers['x-powered-by']).toBeUndefined()
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['strict-transport-security']).toBeTruthy()
  })

  it('renvoie un X-Request-Id', async () => {
    const res = await request(build()).get('/api/health')
    expect(res.headers['x-request-id']).toBeTruthy()
  })

  it('limite le débit des routes /api (429) mais pas la santé', async () => {
    const config = { ...buildTestConfig(), rateLimit: { windowMs: 60_000, max: 2 } }
    const app = build({ config })
    expect((await request(app).get('/api/v1/a')).status).toBe(404)
    expect((await request(app).get('/api/v1/a')).status).toBe(404)
    const limited = await request(app).get('/api/v1/a')
    expect(limited.status).toBe(429)
    expect(limited.body.error.code).toBe('TOO_MANY_REQUESTS')
    expect((await request(app).get('/api/health')).status).toBe(200)
  })
})
