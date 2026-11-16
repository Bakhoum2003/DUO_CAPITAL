import express from 'express'
import { checkDatabaseHealth, connectDatabase, disconnectDatabase } from './config/database.js'
import { ConfigError, loadDotenv, parseEnv } from './config/env.js'
import { createLogger } from './utils/logger.js'

const defaultDatabase = {
  connect: connectDatabase,
  disconnect: disconnectDatabase,
  checkHealth: checkDatabaseHealth,
}

function loadConfigFromProcess() {
  loadDotenv() // sans effet quand aucun fichier .env n'est déployé ; n'écrase jamais une variable déjà définie
  return parseEnv(process.env)
}

const MONGO_URI_PATTERN = /mongodb(?:\+srv)?:\/\/\S+/gi

/** Description d'une erreur d'initialisation pour les journaux : jamais d'adresse de base, d'identifiants ni de pile d'appels. */
function describeInitError(err) {
  if (err instanceof ConfigError) return { name: err.name, message: err.message } // ne cite que des noms de variables
  const message = typeof err?.message === 'string' ? err.message.replace(MONGO_URI_PATTERN, 'mongodb://[MASQUÉ]') : undefined
  return { name: err?.name ?? 'Error', code: err?.code, message }
}

/**
 * Crée un runtime serverless pour l'application Express.
 *
 * @param {object} options
 * @param {typeof import('./app.js').createApp} options.buildApp
 * @param {() => object} [options.loadConfig] retourne la configuration validée (lève ConfigError si invalide)
 * @param {typeof createLogger} [options.createLogger]
 * @param {typeof defaultDatabase} [options.database]
 * @param {() => Date} [options.clock]
 */
export function createServerlessRuntime({
  buildApp,
  loadConfig = loadConfigFromProcess,
  createLogger: makeLogger = createLogger,
  database = defaultDatabase,
  clock,
}) {
  let initialization = null

  async function initialize() {
    const config = loadConfig()
    const logger = makeLogger({ level: config.logLevel, environment: config.env })

    await database.connect({
      url: config.database.url,
      requireReplicaSet: config.database.requireReplicaSet,
      maxPoolSize: config.database.maxPoolSize,
      logger,
    })
    logger.info({ database: config.database.name }, 'MongoDB connecté')

    return { app: buildApp({ config, logger, database, clock }), logger }
  }

  function reportFailure(err) {
    // Configuration absente ou invalide : pas de logger configuré, on en crée un minimal (JSON, sans pino-pretty).
    const logger = makeLogger({ level: 'error', environment: 'production' })
    // Clé « reason » et non « err » : pino appliquerait son sérialiseur d'erreurs (pile d'appels comprise).
    logger.error({ reason: describeInitError(err) }, 'Initialisation de l’API impossible')
  }

  function getApp() {
    if (!initialization) {
      initialization = initialize().catch((err) => {
        initialization = null
        reportFailure(err)
        throw err
      })
    }
    return initialization
  }

  return { getApp }
}


export function createServerlessEntry({ createApp, ...options }) {
  const runtime = createServerlessRuntime({ buildApp: createApp, ...options })
  const entry = express()
  entry.disable('x-powered-by')

  entry.use((req, res, next) => {
    runtime.getApp().then(
      ({ app }) => {
        try {
          app(req, res, next)
        } catch (err) {
          next(err)
        }
      },
      () => {
        res.set('Cache-Control', 'no-store')
        res.set('Retry-After', '5')
        res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Le service est momentanément indisponible.' } })
      },
    )
  })

  return entry
}
