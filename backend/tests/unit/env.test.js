import { describe, expect, it } from 'vitest'
import { ConfigError, parseEnv as parseEnvRaw } from '../../src/config/env.js'
import { TEST_JWT_SECRET } from '../helpers/testConfig.js'

// Depuis B2, JWT_ACCESS_SECRET est obligatoire : les tests de la base de données l'ajoutent par défaut.
// Les tests dédiés au secret (bloc « authentification ») utilisent parseEnvRaw.
const parseEnv = (source) => parseEnvRaw({ JWT_ACCESS_SECRET: TEST_JWT_SECRET, ...source })

const DEV_URL = 'mongodb://127.0.0.1:27017/duo_capital_dev?replicaSet=rs0'
const TEST_URL = 'mongodb://127.0.0.1:27017/duo_capital_test?replicaSet=rs0'

function issuesOf(source) {
  try {
    parseEnv(source)
  } catch (err) {
    expect(err).toBeInstanceOf(ConfigError)
    return err.issues
  }
  return []
}

describe('parseEnv — développement', () => {
  it('applique les valeurs par défaut', () => {
    const config = parseEnv({ DATABASE_URL: DEV_URL })
    expect(config.env).toBe('development')
    expect(config.isDevelopment).toBe(true)
    expect(config.port).toBe(4000)
    expect(config.logLevel).toBe('debug')
    expect(config.frontendOrigins).toEqual(['http://localhost:5173'])
    expect(config.database.name).toBe('duo_capital_dev')
    expect(config.database.requireReplicaSet).toBe(false)
  })

  it('exige DATABASE_URL', () => {
    expect(issuesOf({}).map((i) => i.variable)).toContain('DATABASE_URL')
  })

  it('refuse un PORT invalide et un NODE_ENV inconnu', () => {
    expect(issuesOf({ DATABASE_URL: DEV_URL, PORT: 'abc' }).map((i) => i.variable)).toContain('PORT')
    expect(issuesOf({ DATABASE_URL: DEV_URL, PORT: '70000' }).map((i) => i.variable)).toContain('PORT')
    expect(issuesOf({ DATABASE_URL: DEV_URL, NODE_ENV: 'staging' }).map((i) => i.variable)).toContain('NODE_ENV')
  })

  it('refuse un LOG_LEVEL inconnu', () => {
    expect(issuesOf({ DATABASE_URL: DEV_URL, LOG_LEVEL: 'bavard' }).map((i) => i.variable)).toContain('LOG_LEVEL')
  })

  it('refuse une adresse MongoDB invalide ou sans nom de base', () => {
    expect(issuesOf({ DATABASE_URL: 'http://exemple.test' }).map((i) => i.variable)).toContain('DATABASE_URL')
    expect(issuesOf({ DATABASE_URL: 'mongodb://127.0.0.1:27017' }).map((i) => i.variable)).toContain('DATABASE_URL')
  })

  it('ignore les valeurs vides', () => {
    expect(parseEnv({ DATABASE_URL: DEV_URL, PORT: '', LOG_LEVEL: '  ' }).port).toBe(4000)
  })

  it('retourne une configuration immuable', () => {
    const config = parseEnv({ DATABASE_URL: DEV_URL })
    expect(Object.isFrozen(config)).toBe(true)
    expect(Object.isFrozen(config.database)).toBe(true)
  })
})

describe('parseEnv — production', () => {
  const base = { NODE_ENV: 'production', DATABASE_URL: 'mongodb://127.0.0.1:27017/duo_capital?replicaSet=rs0' }

  it('exige FRONTEND_URL', () => {
    expect(issuesOf(base).map((i) => i.variable)).toContain('FRONTEND_URL')
  })

  it('exige un replica set et journalise en info', () => {
    const config = parseEnv({ ...base, FRONTEND_URL: 'https://duo.example.com' })
    expect(config.isProduction).toBe(true)
    expect(config.database.requireReplicaSet).toBe(true)
    expect(config.logLevel).toBe('info')
  })

  it('refuse le joker « * » et les chemins dans FRONTEND_URL', () => {
    expect(issuesOf({ ...base, FRONTEND_URL: '*' }).map((i) => i.variable)).toContain('FRONTEND_URL')
    expect(issuesOf({ ...base, FRONTEND_URL: 'https://duo.example.com/app' }).map((i) => i.variable)).toContain('FRONTEND_URL')
  })

  it('accepte plusieurs origines et retire la barre finale', () => {
    const config = parseEnv({ ...base, FRONTEND_URL: 'https://a.example.com/, https://b.example.com' })
    expect(config.frontendOrigins).toEqual(['https://a.example.com', 'https://b.example.com'])
  })

  it('refuse une base dont le nom contient « test »', () => {
    const issues = issuesOf({ ...base, FRONTEND_URL: 'https://duo.example.com', DATABASE_URL: TEST_URL })
    expect(issues.map((i) => i.variable)).toContain('DATABASE_URL')
  })
})

describe('parseEnv — messages sans fuite de secrets', () => {
  it('ne cite jamais les identifiants dans les erreurs', () => {
    const secretUri = 'mongodb://utilisateur:motdepasse-fictif@127.0.0.1:27017/duo_capital_test'
    const issues = issuesOf({ NODE_ENV: 'production', DATABASE_URL: secretUri, FRONTEND_URL: 'https://duo.example.com' })
    const text = JSON.stringify(issues)
    expect(text).not.toContain('motdepasse-fictif')
    expect(text).not.toContain('utilisateur')
  })

  it("masque les identifiants dans l'adresse rédigée", () => {
    const config = parseEnv({ DATABASE_URL: 'mongodb://user:pwd-fictif@127.0.0.1:27017/duo_capital_dev' })
    expect(config.database.redactedUrl).not.toContain('pwd-fictif')
    expect(config.database.redactedUrl).toContain('***@')
  })
})

describe('parseEnv — protection des tests', () => {
  it('utilise TOUJOURS TEST_DATABASE_URL quand NODE_ENV=test', () => {
    const config = parseEnv({ NODE_ENV: 'test', DATABASE_URL: DEV_URL, TEST_DATABASE_URL: TEST_URL })
    expect(config.database.url).toBe(TEST_URL)
    expect(config.database.name).toBe('duo_capital_test')
    expect(config.logLevel).toBe('silent')
  })

  it('exige TEST_DATABASE_URL en test, même si DATABASE_URL existe', () => {
    const issues = issuesOf({ NODE_ENV: 'test', DATABASE_URL: DEV_URL })
    expect(issues.map((i) => i.variable)).toEqual(['TEST_DATABASE_URL'])
  })

  it('refuse une base de test qui ne contient pas « test » (base potentiellement réelle)', () => {
    const issues = issuesOf({ NODE_ENV: 'test', TEST_DATABASE_URL: 'mongodb://127.0.0.1:27017/duo_capital?replicaSet=rs0' })
    expect(issues.map((i) => i.variable)).toContain('TEST_DATABASE_URL')
  })

  it('refuse une base de test identique à DATABASE_URL', () => {
    const same = 'mongodb://127.0.0.1:27017/duo_test'
    expect(issuesOf({ NODE_ENV: 'test', DATABASE_URL: same, TEST_DATABASE_URL: same }).length).toBeGreaterThan(0)
  })

  it('refuse un nom qui contient « test » seulement dans un mot (contest, latest)', () => {
    expect(issuesOf({ NODE_ENV: 'test', TEST_DATABASE_URL: 'mongodb://127.0.0.1/contest' }).length).toBeGreaterThan(0)
    expect(issuesOf({ NODE_ENV: 'test', TEST_DATABASE_URL: 'mongodb://127.0.0.1/latest' }).length).toBeGreaterThan(0)
  })

  it('refuse en développement une base nommée « test »', () => {
    expect(issuesOf({ DATABASE_URL: TEST_URL }).map((i) => i.variable)).toContain('DATABASE_URL')
  })
})

describe('parseEnv — MongoDB Atlas', () => {
  const ATLAS_DEV = 'mongodb+srv://duo_user:Ab12cd@cluster0.ab1cd.mongodb.net/duo_capital_dev?retryWrites=true&w=majority&appName=Cluster0'
  const LOCAL_TEST = 'mongodb://127.0.0.1:27017/duo_capital_test?replicaSet=rs0'

  it('accepte DATABASE_URL Atlas en développement', () => {
    const config = parseEnv({ DATABASE_URL: ATLAS_DEV })
    expect(config.database.name).toBe('duo_capital_dev')
    expect(config.database.url).toBe(ATLAS_DEV)
    expect(config.database.redactedUrl).not.toContain('Ab12cd')
    expect(config.database.redactedUrl).toContain('***@cluster0.ab1cd.mongodb.net/duo_capital_dev')
  })

  it('accepte la même URI Atlas en production', () => {
    const config = parseEnv({ NODE_ENV: 'production', DATABASE_URL: ATLAS_DEV, FRONTEND_URL: 'https://duo.example.com' })
    expect(config.database.requireReplicaSet).toBe(true)
  })

  it('accepte Atlas en développement avec une base de test locale séparée', () => {
    expect(parseEnv({ DATABASE_URL: ATLAS_DEV, TEST_DATABASE_URL: LOCAL_TEST }).database.name).toBe('duo_capital_dev')
  })

  it('en test, utilise TEST_DATABASE_URL et jamais l’URI Atlas de développement', () => {
    const config = parseEnv({ NODE_ENV: 'test', DATABASE_URL: ATLAS_DEV, TEST_DATABASE_URL: LOCAL_TEST })
    expect(config.database.url).toBe(LOCAL_TEST)
    expect(config.database.url).not.toContain('mongodb.net')
  })

  it('refuse la base Atlas de développement comme base de test (nom sans « test »)', () => {
    const issues = issuesOf({ NODE_ENV: 'test', TEST_DATABASE_URL: ATLAS_DEV })
    expect(issues.map((i) => i.variable)).toContain('TEST_DATABASE_URL')
  })

  it('refuse une base Atlas de test identique à DATABASE_URL', () => {
    const atlasTest = 'mongodb+srv://u:p@cluster0.ab1cd.mongodb.net/duo_capital_test'
    expect(issuesOf({ NODE_ENV: 'test', DATABASE_URL: atlasTest, TEST_DATABASE_URL: atlasTest }).length).toBeGreaterThan(0)
  })

  it('refuse en développement une base Atlas nommée « test »', () => {
    expect(issuesOf({ DATABASE_URL: 'mongodb+srv://u:p@cluster0.ab1cd.mongodb.net/duo_capital_test' }).map((i) => i.variable)).toContain('DATABASE_URL')
  })

  it('refuse une URI Atlas sans nom de base', () => {
    expect(issuesOf({ DATABASE_URL: 'mongodb+srv://u:p@cluster0.ab1cd.mongodb.net/?retryWrites=true' }).map((i) => i.variable)).toContain('DATABASE_URL')
  })

  it('tolère les guillemets autour de la valeur (variable système Windows)', () => {
    expect(parseEnv({ DATABASE_URL: `"${ATLAS_DEV}"` }).database.url).toBe(ATLAS_DEV)
  })

  it('explique la raison du rejet sans citer la valeur ni les identifiants', () => {
    const issues = issuesOf({ DATABASE_URL: 'mongodb+srv://duo_user:mot-de-passe-fictif@@cluster0.ab1cd.mongodb.net/duo_capital_dev' })
    expect(issues[0].message).toContain('%40')
    expect(JSON.stringify(issues)).not.toContain('mot-de-passe-fictif')
    expect(JSON.stringify(issues)).not.toContain('duo_user')
  })
})

describe('parseEnv — authentification (JWT et cookies)', () => {
  const dev = { DATABASE_URL: DEV_URL }
  const prod = { NODE_ENV: 'production', DATABASE_URL: 'mongodb://127.0.0.1:27017/duo_capital?replicaSet=rs0', FRONTEND_URL: 'https://duo.example.com' }
  const rawIssues = (source) => {
    try {
      parseEnvRaw(source)
    } catch (err) {
      return err.issues
    }
    return []
  }

  it('exige JWT_ACCESS_SECRET', () => {
    expect(rawIssues(dev).map((i) => i.variable)).toContain('JWT_ACCESS_SECRET')
  })

  it('refuse un secret trop court, le modèle de .env.example ou une valeur répétitive', () => {
    expect(rawIssues({ ...dev, JWT_ACCESS_SECRET: 'court' }).map((i) => i.variable)).toContain('JWT_ACCESS_SECRET')
    expect(rawIssues({ ...dev, JWT_ACCESS_SECRET: 'CHANGE_ME_generez_un_secret_aleatoire_de_48_octets' }).map((i) => i.variable)).toContain('JWT_ACCESS_SECRET')
    expect(rawIssues({ ...dev, JWT_ACCESS_SECRET: 'a'.repeat(64) }).map((i) => i.variable)).toContain('JWT_ACCESS_SECRET')
  })

  it('ne cite jamais le secret dans les messages d’erreur', () => {
    const issues = rawIssues({ ...dev, JWT_ACCESS_SECRET: 'secret-fictif-trop-court' })
    expect(JSON.stringify(issues)).not.toContain('secret-fictif-trop-court')
  })

  it('applique les durées par défaut (15 min, 7 jours) et les valeurs configurées', () => {
    const config = parseEnv(dev)
    expect(config.auth.accessTokenTtlSeconds).toBe(15 * 60)
    expect(config.auth.refreshTokenTtlSeconds).toBe(7 * 24 * 3600)
    const custom = parseEnv({ ...dev, ACCESS_TOKEN_TTL_MINUTES: '5', REFRESH_TOKEN_TTL_DAYS: '30' })
    expect(custom.auth.accessTokenTtlSeconds).toBe(300)
    expect(custom.auth.refreshTokenTtlSeconds).toBe(30 * 24 * 3600)
  })

  it('refuse des durées hors limites', () => {
    expect(issuesOf({ ...dev, ACCESS_TOKEN_TTL_MINUTES: '0' }).map((i) => i.variable)).toContain('ACCESS_TOKEN_TTL_MINUTES')
    expect(issuesOf({ ...dev, ACCESS_TOKEN_TTL_MINUTES: '600' }).map((i) => i.variable)).toContain('ACCESS_TOKEN_TTL_MINUTES')
    expect(issuesOf({ ...dev, REFRESH_TOKEN_TTL_DAYS: '365' }).map((i) => i.variable)).toContain('REFRESH_TOKEN_TTL_DAYS')
  })

  it('cookies : Secure uniquement en production, SameSite=lax par défaut', () => {
    expect(parseEnv(dev).cookies).toEqual({ secure: false, sameSite: 'lax' })
    expect(parseEnv(prod).cookies).toEqual({ secure: true, sameSite: 'lax' })
  })

  it('SameSite=none exige la production (cookies Secure)', () => {
    expect(issuesOf({ ...dev, COOKIE_SAME_SITE: 'none' }).map((i) => i.variable)).toContain('COOKIE_SAME_SITE')
    expect(parseEnv({ ...prod, COOKIE_SAME_SITE: 'none' }).cookies).toEqual({ secure: true, sameSite: 'none' })
    expect(issuesOf({ ...dev, COOKIE_SAME_SITE: 'bizarre' }).map((i) => i.variable)).toContain('COOKIE_SAME_SITE')
  })

  it('le secret JWT est utilisable mais jamais énumérable (JSON, copie, journaux)', () => {
    const config = parseEnv(dev)
    expect(config.auth.jwtSecret).toBe(TEST_JWT_SECRET)
    expect(JSON.stringify(config)).not.toContain(TEST_JWT_SECRET)
    expect({ ...config.auth }.jwtSecret).toBeUndefined()
    expect(Object.isFrozen(config.auth)).toBe(true)
  })
})
