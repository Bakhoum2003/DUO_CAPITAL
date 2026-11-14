// Connexion MongoDB (Mongoose). Une seule connexion partagée par toute l'application.

import mongoose from 'mongoose'

const CONNECTION_STATES = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }
const SERVER_SELECTION_TIMEOUT_MS = 5000
const HEALTH_PING_TIMEOUT_MS = 2000

let transactionsSupported = null
let listenersAttached = false

function withTimeout(promise, timeoutMs) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Délai dépassé.')), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// Les transactions MongoDB exigent un replica set (ou un cluster shardé).
async function detectTransactionSupport() {
  const hello = await mongoose.connection.db.admin().command({ hello: 1 })
  return Boolean(hello.setName) || hello.msg === 'isdbgrid'
}

function attachConnectionLogging(logger) {
  if (listenersAttached || !logger) return
  listenersAttached = true
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB : connexion perdue.'))
  mongoose.connection.on('reconnected', () => logger.info('MongoDB : connexion rétablie.'))
  mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB : erreur de connexion.'))
}

/**
 * Ouvre la connexion MongoDB (idempotent : jamais deux connexions).
 *
 * @param {object} options
 * @param {string} options.url adresse de la base (DATABASE_URL, ou TEST_DATABASE_URL en test)
 * @param {boolean} [options.requireReplicaSet] refuse une base qui ne supporte pas les transactions
 * @param {import('pino').Logger} [options.logger]
 */
export async function connectDatabase({ url, requireReplicaSet = false, logger }) {
  const state = mongoose.connection.readyState
  if (state === 1) return mongoose.connection
  if (state === 2) {
    await mongoose.connection.asPromise()
    return mongoose.connection
  }

  attachConnectionLogging(logger)
  mongoose.set('strictQuery', true)
  await mongoose.connect(url, { serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS, maxPoolSize: 10 })

  transactionsSupported = await detectTransactionSupport()
  if (!transactionsSupported) {
    if (requireReplicaSet) {
      await mongoose.disconnect()
      throw new Error(
        "La base MongoDB n'est pas un replica set : les transactions sont indisponibles. Configurez un replica set (voir README).",
      )
    }
    logger?.warn("MongoDB n'est pas un replica set : les transactions seront indisponibles (à corriger avant la production).")
  }

  return mongoose.connection
}

/** Ferme la connexion MongoDB (sans erreur si elle est déjà fermée). */
export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
  transactionsSupported = null
}

/**
 * État réel de la base. « connected » seulement si un ping répond : une connexion ouverte mais muette
 * est signalée « unreachable ».
 * @returns {Promise<{ status: 'connected' | 'connecting' | 'disconnecting' | 'disconnected' | 'unreachable', transactions: boolean | null }>}
 */
export async function checkDatabaseHealth({ timeoutMs = HEALTH_PING_TIMEOUT_MS } = {}) {
  const state = CONNECTION_STATES[mongoose.connection.readyState] ?? 'disconnected'
  if (state !== 'connected') return { status: state, transactions: null }

  try {
    await withTimeout(mongoose.connection.db.admin().ping(), timeoutMs)
    return { status: 'connected', transactions: transactionsSupported }
  } catch {
    return { status: 'unreachable', transactions: null }
  }
}
