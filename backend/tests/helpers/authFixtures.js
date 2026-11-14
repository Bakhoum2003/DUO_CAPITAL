import { randomBytes } from 'node:crypto'
import mongoose from 'mongoose'
import { afterAll, beforeAll, beforeEach, inject } from 'vitest'
import { checkDatabaseHealth, connectDatabase, disconnectDatabase } from '../../src/config/database.js'
import { assertSafeTestDatabaseUri } from '../../src/config/env.js'
import { AuditLog } from '../../src/models/AuditLog.js'
import { Session } from '../../src/models/Session.js'
import { User } from '../../src/models/User.js'
import { hashPassword } from '../../src/services/password.service.js'
import { assertTestDatabaseName, clearTestCollections, dropTestDatabase } from './testDatabase.js'

// Mots de passe FICTIFS, valables uniquement dans les tests.
export const TEST_PASSWORD = 'Mot-de-passe-de-test-1!'
export const OTHER_PASSWORD = 'Un-autre-mot-de-passe-2!'

/** URL de la base de test fournie par globalSetup (jamais DATABASE_URL). Chaîne vide si aucune base n'est disponible. */
export const testDatabaseUrl = () => inject('testDatabaseUrl')

// Remplace le nom de base d'une adresse MongoDB (identifiants, hôtes et paramètres conservés).
function withDatabaseName(url, databaseName) {
  const match = /^(mongodb(?:\+srv)?:\/\/[^/?]+)(?:\/[^?]*)?(\?.*)?$/.exec(url)
  if (!match) throw new Error('Adresse MongoDB de test invalide.')
  return `${match[1]}/${databaseName}${match[2] ?? ''}`
}

/**
 * Branche un fichier de test sur la base de test (en mémoire ou TEST_DATABASE_URL) : connexion, index, nettoyage avant
 * chaque test. Chaque fichier de test utilise sa PROPRE base (duo_capital_test_<hasard>, supprimée à la fin) :
 * les fichiers s'exécutent en parallèle et ne doivent jamais se vider mutuellement.
 * À appeler dans un `describe.skipIf(!testDatabaseUrl())`.
 */
export function useTestDatabase() {
  const url = withDatabaseName(testDatabaseUrl() || 'mongodb://127.0.0.1:1', `duo_capital_test_${randomBytes(4).toString('hex')}`)

  beforeAll(async () => {
    assertSafeTestDatabaseUri(url)
    await connectDatabase({ url, requireReplicaSet: true })
    assertTestDatabaseName(mongoose.connection.name)
    await Promise.all([User, Session, AuditLog].map((model) => model.init()))
  })

  beforeEach(async () => {
    await clearTestCollections()
  })

  afterAll(async () => {
    await dropTestDatabase() // refusé si le nom ne contient pas « test »
    await disconnectDatabase()
  })

  return { database: { connect: connectDatabase, disconnect: disconnectDatabase, checkHealth: checkDatabaseHealth } }
}

/** Crée un associé de test (empreinte Argon2id réelle). */
export async function createTestUser({ partnerNumber = 1, name = 'Mohamed Bakhoum', email = 'mohamed@example.com', password = TEST_PASSWORD, ...rest } = {}) {
  const user = await User.create({ partnerNumber, name, email, passwordHash: await hashPassword(password), ...rest })
  return { user, password }
}

/** Valeurs « Set-Cookie » d'une réponse, sous forme de tableau. */
export const setCookieLines = (res) => [res.headers['set-cookie'] ?? []].flat()

/** { name, value, attributes: { HttpOnly: true, Path: '/api', ... } } pour le cookie demandé, ou null. */
export function readSetCookie(res, name) {
  const line = setCookieLines(res).find((entry) => entry.startsWith(`${name}=`))
  if (!line) return null
  const [pair, ...attributeParts] = line.split(';').map((part) => part.trim())
  const attributes = {}
  for (const part of attributeParts) {
    const [key, ...value] = part.split('=')
    attributes[key.toLowerCase()] = value.length === 0 ? true : value.join('=')
  }
  return { name, value: decodeURIComponent(pair.slice(name.length + 1)), attributes }
}

/** En-tête Cookie à renvoyer : cookieHeader({ dc_access: '…', dc_refresh: '…' }). */
export const cookieHeader = (cookies) =>
  Object.entries(cookies)
    .filter(([, value]) => value != null)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('; ')
