import { describe, expect, it } from 'vitest'
import { ConfigError, parseEnv } from '../../src/config/env.js'
import { buildTestConfig } from '../helpers/testConfig.js'

const PRODUCTION_ENV = {
  NODE_ENV: 'production',
  DATABASE_URL: 'mongodb://127.0.0.1:27017/duo_capital_prod?replicaSet=rs0',
  FRONTEND_URL: 'https://duo-capital-frontend.vercel.app',
  JWT_ACCESS_SECRET: 'prod-only-Zq81mXv7LpTn4YcR2wKs9HdB6eFg0JaU3',
  COOKIE_SAME_SITE: 'lax',
}

function issuesOf(overrides) {
  try {
    buildTestConfig(overrides)
  } catch (err) {
    if (err instanceof ConfigError) return err.issues
    throw err
  }
  return []
}

describe('TRUST_PROXY', () => {
  it('est désactivé par défaut (aucun proxy de confiance)', () => {
    expect(buildTestConfig().trustProxy).toBe(0)
    expect(buildTestConfig({ TRUST_PROXY: '' }).trustProxy).toBe(0)
  })

  it('accepte un nombre entier de proxys entre 0 et 5', () => {
    for (const [raw, expected] of [['0', 0], ['1', 1], [' 2 ', 2], ['5', 5]]) {
      expect(buildTestConfig({ TRUST_PROXY: raw }).trustProxy).toBe(expected)
    }
  })

  it.each(['oui', 'true', '-1', '6', '1.5', '99'])('refuse %s sans répéter la valeur dans le message', (value) => {
    const issues = issuesOf({ TRUST_PROXY: value })
    expect(issues.map((issue) => issue.variable)).toEqual(['TRUST_PROXY'])
    expect(issues[0].message).not.toContain(value)
  })

  it('configuration Vercel : production, TRUST_PROXY=1, cookies lax et Secure', () => {
    const config = parseEnv({ ...PRODUCTION_ENV, TRUST_PROXY: '1' })
    expect(config.trustProxy).toBe(1)
    expect(config.cookies).toEqual({ secure: true, sameSite: 'lax' })
    expect(Object.isFrozen(config)).toBe(true)
  })

  it('la configuration de production sans TRUST_PROXY reste à 0', () => {
    expect(parseEnv(PRODUCTION_ENV).trustProxy).toBe(0)
  })
})

describe('MONGO_MAX_POOL_SIZE', () => {
  it('vaut 10 par défaut (comportement historique)', () => {
    expect(buildTestConfig().database.maxPoolSize).toBe(10)
    expect(parseEnv(PRODUCTION_ENV).database.maxPoolSize).toBe(10)
  })

  it('peut être réglé, par exemple à 5 en production', () => {
    expect(parseEnv({ ...PRODUCTION_ENV, MONGO_MAX_POOL_SIZE: '5' }).database.maxPoolSize).toBe(5)
    expect(buildTestConfig({ MONGO_MAX_POOL_SIZE: '1' }).database.maxPoolSize).toBe(1)
    expect(buildTestConfig({ MONGO_MAX_POOL_SIZE: '100' }).database.maxPoolSize).toBe(100)
  })

  it.each(['0', '-3', '101', 'beaucoup', '2.5'])('refuse %s', (value) => {
    expect(issuesOf({ MONGO_MAX_POOL_SIZE: value }).map((issue) => issue.variable)).toEqual(['MONGO_MAX_POOL_SIZE'])
  })

  it('la taille du pool n’expose ni l’adresse ni les identifiants de la base', () => {
    const config = buildTestConfig({ MONGO_MAX_POOL_SIZE: '5' })
    expect(JSON.stringify(config.database)).not.toMatch(/@/)
  })
})
