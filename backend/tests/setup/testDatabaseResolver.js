// Dans les deux modes, une adresse de base de test dangereuse (nom sans « test », ou même base que DATABASE_URL)
// arrête toute la suite. Aucun message d'erreur ne contient d'adresse MongoDB, d'identifiant ni de mot de passe.

import { ConfigError, getTestDatabaseIssues } from '../../src/config/env.js'

const MONGO_URI_IN_TEXT = /mongodb(?:\+srv)?:\/\/\S+/gi
const REACHABILITY_TIMEOUT_MS = 5000

export function scrubMongoUris(text) {
  return String(text ?? '').replace(MONGO_URI_IN_TEXT, '[adresse MongoDB masquée]')
}

export function isStrictMode(env = process.env) {
  const raw = String(env.REQUIRE_DB_TESTS ?? '').trim()
  if (raw === '' || raw === '0') return false
  if (raw === '1') return true
  throw new Error('REQUIRE_DB_TESTS a une valeur non reconnue : utilisez 1 (mode strict) ou 0 / absent (mode normal).')
}

function assertSafeTestUrl(url, mainUrl) {
  const issues = getTestDatabaseIssues(url, mainUrl || undefined)
  if (issues.length > 0) throw new ConfigError(issues.map((message) => ({ variable: 'TEST_DATABASE_URL', message })))
}

/**
 * @param {object} options
 * @param {Record<string, string | undefined>} options.env variables du processus
 * @param {{ TEST_DATABASE_URL?: string, DATABASE_URL?: string }} [options.envFile] valeurs lues dans backend/.env (comparaison seulement)
 * @param {() => Promise<{ url: string, stop?: () => Promise<void> }>} options.startMemoryDatabase base temporaire en mémoire
 * @param {(url: string) => Promise<void>} options.checkReachable vérifie qu'une base de test répond (mode strict)
 * @returns {Promise<{ url: string, source: 'TEST_DATABASE_URL' | 'memory' | 'unavailable', error: string, stop?: () => Promise<void> }>}
 */
export async function resolveTestDatabase({ env, envFile = {}, startMemoryDatabase, checkReachable }) {
  const strict = isStrictMode(env)
  const explicitUrl = (env.TEST_DATABASE_URL || envFile.TEST_DATABASE_URL || '').trim()
  const mainUrl = (env.DATABASE_URL || envFile.DATABASE_URL || '').trim()

  if (explicitUrl) {
    assertSafeTestUrl(explicitUrl, mainUrl)
    if (strict) {
      try {
        await checkReachable(explicitUrl)
      } catch (err) {
        throw new Error(`REQUIRE_DB_TESTS=1 : la base de test (TEST_DATABASE_URL) est injoignable. Cause : ${scrubMongoUris(err?.message ?? err)}`)
      }
    }
    return { url: explicitUrl, source: 'TEST_DATABASE_URL', error: '' }
  }

  let memory
  try {
    memory = await startMemoryDatabase()
  } catch (err) {
    const reason = scrubMongoUris(err?.message ?? err)
    if (strict) {
      throw new Error(`REQUIRE_DB_TESTS=1 : aucune base MongoDB de test disponible, les tests d'intégration ne peuvent pas être ignorés. Cause : ${reason}`)
    }
    return { url: '', source: 'unavailable', error: reason }
  }

  try {
    assertSafeTestUrl(memory.url, mainUrl)
  } catch (err) {
    await memory.stop?.()
    throw err
  }
  return { url: memory.url, source: 'memory', error: '', stop: memory.stop }
}

/** Démarre une base MongoDB temporaire en mémoire (replica set à 1 nœud : les transactions fonctionnent). */
export async function startMemoryDatabase() {
  const { MongoMemoryReplSet } = await import('mongodb-memory-server')
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  return { url: replSet.getUri('duo_capital_test'), stop: () => replSet.stop() }
}

export async function checkTestDatabaseReachable(url) {
  const { default: mongoose } = await import('mongoose')
  const connection = mongoose.createConnection(url, { serverSelectionTimeoutMS: REACHABILITY_TIMEOUT_MS })
  try {
    await connection.asPromise()
    await connection.db.admin().command({ ping: 1 })
  } finally {
    await connection.close().catch(() => {})
  }
}
