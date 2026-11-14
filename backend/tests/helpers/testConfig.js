import { parseEnv } from '../../src/config/env.js'

export const TEST_DATABASE_URL = 'mongodb://127.0.0.1:27017/duo_capital_test?replicaSet=rs0'
export const DEVELOPMENT_DATABASE_URL = 'mongodb://127.0.0.1:27017/duo_capital_dev?replicaSet=rs0'
export const FRONTEND_ORIGIN = 'http://localhost:5173'
// Secret FICTIF réservé aux tests (aucune valeur réelle).
export const TEST_JWT_SECRET = 'test-only-Zq81mXv7LpTn4YcR2wKs9HdB6eFg0JaU3'

/** Configuration de test valide (NODE_ENV=test, base de test), avec possibilité de changer des variables. */
export function buildTestConfig(overrides = {}) {
  return parseEnv({
    NODE_ENV: 'test',
    TEST_DATABASE_URL,
    FRONTEND_URL: FRONTEND_ORIGIN,
    JWT_ACCESS_SECRET: TEST_JWT_SECRET,
    ...overrides,
  })
}

/** Logger factice pour les tests unitaires (aucune sortie). */
export function createSilentLogger() {
  const calls = { error: [], warn: [], info: [] }
  return {
    calls,
    error: (...args) => calls.error.push(args),
    warn: (...args) => calls.warn.push(args),
    info: (...args) => calls.info.push(args),
    debug() {},
    fatal() {},
  }
}

/** Copie d'une configuration avec d'autres réglages d'authentification (le secret reste non énumérable). */
export function withAuth(config, patch) {
  const auth = { ...config.auth, ...patch }
  Object.defineProperty(auth, 'jwtSecret', { value: config.auth.jwtSecret, enumerable: false })
  return { ...config, auth: Object.freeze(auth) }
}
