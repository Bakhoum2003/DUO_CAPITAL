// refus des bases dangereuses, absence de divulgation d'adresses ou d'identifiants. Aucune connexion MongoDB réelle : tout est simulé.

import { describe, expect, it, vi } from 'vitest'
import { ConfigError } from '../../src/config/env.js'
import { assertDisposableTestDatabaseName, createDisposableDatabaseName, withDatabaseName } from '../helpers/testDatabase.js'
import { isStrictMode, resolveTestDatabase, scrubMongoUris } from '../setup/testDatabaseResolver.js'

// Valeurs FICTIVES, uniquement pour ces tests.
const SECRET = 'S3cretPass-fictif'
const TEST_URL = `mongodb://testuser:${SECRET}@db-test.example.com:27017/duo_capital_test?replicaSet=rs0`
const MAIN_URL = `mongodb://produser:${SECRET}@db-prod.example.com:27017/duo_capital`
const MEMORY_URL = 'mongodb://127.0.0.1:41234/duo_capital_test?replicaSet=rs0'

function build(overrides = {}) {
  const startMemoryDatabase = vi.fn(async () => ({ url: MEMORY_URL, stop: vi.fn(async () => {}) }))
  const checkReachable = vi.fn(async () => {})
  return { startMemoryDatabase, checkReachable, env: {}, envFile: {}, ...overrides }
}

async function rejection(options) {
  try {
    await resolveTestDatabase(options)
  } catch (err) {
    return err
  }
  throw new Error('Une erreur était attendue.')
}

function expectNoLeak(error) {
  const text = `${error.message}\n${error.stack ?? ''}\n${JSON.stringify(error.issues ?? [])}`
  expect(text).not.toContain(SECRET)
  expect(text).not.toContain('testuser')
  expect(text).not.toContain('produser')
  expect(text).not.toContain('db-test.example.com')
  expect(text).not.toContain('db-prod.example.com')
  expect(text).not.toMatch(/mongodb(\+srv)?:\/\/[^\s]*@/)
}

describe('REQUIRE_DB_TESTS : lecture du mode', () => {
  it('absent, vide ou 0 : mode normal', () => {
    expect(isStrictMode({})).toBe(false)
    expect(isStrictMode({ REQUIRE_DB_TESTS: '' })).toBe(false)
    expect(isStrictMode({ REQUIRE_DB_TESTS: '0' })).toBe(false)
  })

  it('1 : mode strict', () => {
    expect(isStrictMode({ REQUIRE_DB_TESTS: '1' })).toBe(true)
  })

  it('toute autre valeur est une erreur explicite (jamais ignorée en silence)', () => {
    expect(() => isStrictMode({ REQUIRE_DB_TESTS: 'true' })).toThrow(/REQUIRE_DB_TESTS/)
    expect(() => isStrictMode({ REQUIRE_DB_TESTS: 'oui' })).toThrow(/REQUIRE_DB_TESTS/)
  })
})

describe('mode normal (REQUIRE_DB_TESTS désactivé)', () => {
  it('base en mémoire disponible : elle est utilisée', async () => {
    const options = build()
    const result = await resolveTestDatabase(options)
    expect(result).toMatchObject({ url: MEMORY_URL, source: 'memory', error: '' })
    expect(typeof result.stop).toBe('function')
  })

  it('aucune base disponible : repli prévu (adresse vide, tests ignorés), sans erreur ni échec', async () => {
    const options = build({ startMemoryDatabase: vi.fn(async () => { throw new Error('binaire mongod introuvable') }) })
    const result = await resolveTestDatabase(options)
    expect(result).toMatchObject({ url: '', source: 'unavailable' })
    expect(result.error).toContain('binaire mongod introuvable')
  })

  it("TEST_DATABASE_URL valide : utilisée, sans connexion de contrôle ni base en mémoire", async () => {
    const options = build({ env: { TEST_DATABASE_URL: TEST_URL } })
    const result = await resolveTestDatabase(options)
    expect(result).toMatchObject({ url: TEST_URL, source: 'TEST_DATABASE_URL', error: '' })
    expect(options.checkReachable).not.toHaveBeenCalled()
    expect(options.startMemoryDatabase).not.toHaveBeenCalled()
  })

  it('TEST_DATABASE_URL lue dans le fichier .env fournie par globalSetup : même comportement', async () => {
    const result = await resolveTestDatabase(build({ envFile: { TEST_DATABASE_URL: TEST_URL } }))
    expect(result.source).toBe('TEST_DATABASE_URL')
  })
})

describe('mode strict (REQUIRE_DB_TESTS=1)', () => {
  const strict = { REQUIRE_DB_TESTS: '1' }

  it('base en mémoire disponible : utilisée normalement', async () => {
    const result = await resolveTestDatabase(build({ env: strict }))
    expect(result).toMatchObject({ url: MEMORY_URL, source: 'memory' })
  })

  it('MongoDB de test indisponible : échec explicite au lieu de tests ignorés, sans divulgation', async () => {
    const options = build({
      env: strict,
      startMemoryDatabase: vi.fn(async () => { throw new Error(`échec de démarrage vers ${TEST_URL}`) }),
    })
    const error = await rejection(options)
    expect(error.message).toContain('REQUIRE_DB_TESTS=1')
    expect(error.message).toContain('ne peuvent pas être ignorés')
    expectNoLeak(error)
  })

  it('base de test explicite injoignable : échec explicite, sans divulgation', async () => {
    const options = build({
      env: { ...strict, TEST_DATABASE_URL: TEST_URL },
      checkReachable: vi.fn(async () => { throw new Error(`connexion refusée : ${TEST_URL}`) }),
    })
    const error = await rejection(options)
    expect(error.message).toContain('injoignable')
    expect(options.checkReachable).toHaveBeenCalledOnce()
    expectNoLeak(error)
  })

  it('base de test explicite joignable : utilisée', async () => {
    const options = build({ env: { ...strict, TEST_DATABASE_URL: TEST_URL } })
    const result = await resolveTestDatabase(options)
    expect(result.source).toBe('TEST_DATABASE_URL')
    expect(options.checkReachable).toHaveBeenCalledOnce()
  })

  it("jamais de résultat « aucune base » : soit une adresse, soit une erreur (donc aucun test d'intégration ignoré)", async () => {
    const failures = [
      build({ env: strict, startMemoryDatabase: vi.fn(async () => { throw new Error('indisponible') }) }),
      build({ env: { ...strict, TEST_DATABASE_URL: TEST_URL }, checkReachable: vi.fn(async () => { throw new Error('indisponible') }) }),
    ]
    for (const options of failures) await expect(resolveTestDatabase(options)).rejects.toThrow()
    const ok = await resolveTestDatabase(build({ env: strict }))
    expect(ok.url).not.toBe('')
  })

  it('valeur de REQUIRE_DB_TESTS non reconnue : erreur explicite', async () => {
    await expect(resolveTestDatabase(build({ env: { REQUIRE_DB_TESTS: 'true' } }))).rejects.toThrow(/REQUIRE_DB_TESTS/)
  })
})

describe.each([
  ['mode normal', {}],
  ['mode strict', { REQUIRE_DB_TESTS: '1' }],
])('protections de la base de test (%s)', (_label, modeEnv) => {
  it('refuse une base dont le nom ne contient pas « test »', async () => {
    const unsafe = `mongodb://testuser:${SECRET}@db-test.example.com:27017/duo_capital`
    const error = await rejection(build({ env: { ...modeEnv, TEST_DATABASE_URL: unsafe } }))
    expect(error).toBeInstanceOf(ConfigError)
    expect(error.message).toContain('test')
    expectNoLeak(error)
  })

  it("refuse une base de test sans nom de base", async () => {
    const error = await rejection(build({ env: { ...modeEnv, TEST_DATABASE_URL: `mongodb://testuser:${SECRET}@db-test.example.com:27017` } }))
    expect(error).toBeInstanceOf(ConfigError)
    expectNoLeak(error)
  })

  it('refuse une adresse invalide sans la recopier', async () => {
    const error = await rejection(build({ env: { ...modeEnv, TEST_DATABASE_URL: `http://testuser:${SECRET}@db-test.example.com/duo_capital_test` } }))
    expect(error).toBeInstanceOf(ConfigError)
    expectNoLeak(error)
  })

  it('refuse une base de test identique à DATABASE_URL (même hôte et même base, identifiants différents ou casse différente)', async () => {
    const sameBase = `mongodb://autre:autre-mot-de-passe@DB-PROD.example.com:27017/duo_capital_test`
    const test = `mongodb://testuser:${SECRET}@db-prod.example.com:27017/duo_capital_test`
    const error = await rejection(build({ env: { ...modeEnv, TEST_DATABASE_URL: test, DATABASE_URL: sameBase } }))
    expect(error).toBeInstanceOf(ConfigError)
    expect(error.message).toContain('identique')
    expectNoLeak(error)
  })

  it('refuse aussi quand DATABASE_URL vient du fichier .env', async () => {
    const test = `mongodb://testuser:${SECRET}@db-prod.example.com:27017/duo_capital_test`
    const main = `mongodb://produser:${SECRET}@db-prod.example.com:27017/duo_capital_test`
    const error = await rejection(build({ env: { ...modeEnv, TEST_DATABASE_URL: test }, envFile: { DATABASE_URL: main } }))
    expect(error.message).toContain('identique')
    expectNoLeak(error)
  })

  it('accepte une base de test qui diffère de DATABASE_URL', async () => {
    const result = await resolveTestDatabase(build({ env: { ...modeEnv, TEST_DATABASE_URL: TEST_URL, DATABASE_URL: MAIN_URL } }))
    expect(result.source).toBe('TEST_DATABASE_URL')
  })

  it("une base en mémoire dangereuse est arrêtée puis éteinte (jamais ignorée)", async () => {
    const stop = vi.fn(async () => {})
    const options = build({ env: modeEnv, startMemoryDatabase: vi.fn(async () => ({ url: 'mongodb://127.0.0.1:1/duo_capital', stop })) })
    await expect(resolveTestDatabase(options)).rejects.toBeInstanceOf(ConfigError)
    expect(stop).toHaveBeenCalledOnce()
  })
})

describe('masquage des adresses dans les messages', () => {
  it('remplace toute adresse MongoDB, identifiants compris', () => {
    const text = scrubMongoUris(`échec sur ${MAIN_URL} puis mongodb+srv://u:${SECRET}@cluster0.example.mongodb.net/x?a=b`)
    expect(text).not.toContain(SECRET)
    expect(text).not.toMatch(/mongodb(\+srv)?:\/\//)
    expect(text).toContain('[adresse MongoDB masquée]')
  })

  it('laisse intact un texte sans adresse', () => {
    expect(scrubMongoUris('délai dépassé')).toBe('délai dépassé')
  })
})

describe('bases temporaires : nom strict et remplacement du nom de base', () => {
  it('les noms générés respectent le format strict', () => {
    for (let index = 0; index < 20; index += 1) expect(() => assertDisposableTestDatabaseName(createDisposableDatabaseName())).not.toThrow()
  })

  it('refuse tout autre nom, y compris la base de test principale et les noms de production', () => {
    for (const name of ['duo_capital', 'duo_capital_test', 'duo_capital_test_', 'duo_capital_test_0123abc', 'duo_capital_test_0123abcdef', 'duo_capital_test_0123ABCD', 'prod_test_0123abcd', 'x', '', undefined, null]) {
      expect(() => assertDisposableTestDatabaseName(name)).toThrow(/Opération destructrice refusée/)
    }
  })

  it('withDatabaseName garde hôtes, identifiants et paramètres, et ne change que la base', () => {
    expect(withDatabaseName('mongodb://u:p@h1:1,h2:2/ancienne?replicaSet=rs0&x=1', 'duo_capital_test_0123abcd')).toBe('mongodb://u:p@h1:1,h2:2/duo_capital_test_0123abcd?replicaSet=rs0&x=1')
    expect(withDatabaseName('mongodb://127.0.0.1:27017', 'duo_capital_test_0123abcd')).toBe('mongodb://127.0.0.1:27017/duo_capital_test_0123abcd')
    expect(() => withDatabaseName('pas une adresse', 'x')).toThrow()
  })
})
