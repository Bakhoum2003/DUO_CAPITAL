import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../../src/app.js'
import { createLogger } from '../../src/utils/logger.js'
import { createFakeDatabase } from '../helpers/fakeDatabase.js'
import { buildTestConfig } from '../helpers/testConfig.js'

const logger = createLogger({ level: 'silent', environment: 'test' })
const PATH = '/api/v1/inconnu' // 404, mais compté par la limite de débit de /api

function build({ trustProxy, max = 2 } = {}) {
  const config = buildTestConfig(trustProxy === undefined ? {} : { TRUST_PROXY: String(trustProxy) })
  return createApp({ config: { ...config, rateLimit: { windowMs: 60_000, max } }, logger, database: createFakeDatabase() })
}

const statuses = async (app, forwardedFor) => {
  const result = []
  for (const value of forwardedFor) result.push((await request(app).get(PATH).set('X-Forwarded-For', value)).status)
  return result
}

beforeEach(() => {
  // express-rate-limit signale en console un X-Forwarded-For reçu sans proxy de confiance : bruit attendu ici.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('TRUST_PROXY désactivé (défaut, démarrage local)', () => {
  it('« trust proxy » n’est pas activé', () => {
    expect(build().get('trust proxy')).toBeFalsy()
  })

  it('X-Forwarded-For est ignoré : un client ne peut pas contourner la limite en changeant d’adresse annoncée', async () => {
    expect(await statuses(build(), ['1.1.1.1', '2.2.2.2', '3.3.3.3'])).toEqual([404, 404, 429])
  })
})

describe('TRUST_PROXY=1 (Vercel)', () => {
  it('« trust proxy » vaut 1', () => {
    expect(build({ trustProxy: 1 }).get('trust proxy')).toBe(1)
  })

  it('la limite est comptée par client réel : deux clients distincts ne se bloquent pas', async () => {
    const app = build({ trustProxy: 1 })
    expect(await statuses(app, ['1.1.1.1', '1.1.1.1', '1.1.1.1'])).toEqual([404, 404, 429])
    expect(await statuses(app, ['2.2.2.2'])).toEqual([404])
  })

  it('une adresse falsifiée en tête de X-Forwarded-For ne change pas le compteur (seul le dernier saut est cru)', async () => {
    const app = build({ trustProxy: 1 })
    expect(await statuses(app, ['9.9.9.9, 1.1.1.1', '8.8.8.8, 1.1.1.1', '7.7.7.7, 1.1.1.1'])).toEqual([404, 404, 429])
  })

  it('la réponse de limite garde le format d’erreur commun', async () => {
    const app = build({ trustProxy: 1, max: 1 })
    await request(app).get(PATH).set('X-Forwarded-For', '1.1.1.1')
    const limited = await request(app).get(PATH).set('X-Forwarded-For', '1.1.1.1')
    expect(limited.status).toBe(429)
    expect(limited.body.error.code).toBe('TOO_MANY_REQUESTS')
  })
})
