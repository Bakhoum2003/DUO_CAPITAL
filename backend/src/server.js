import http from 'node:http'
import { pathToFileURL } from 'node:url'
import { createApp } from './app.js'
import { SHUTDOWN_TIMEOUT_MS } from './config/constants.js'
import { checkDatabaseHealth, connectDatabase, disconnectDatabase } from './config/database.js'
import { ConfigError, loadDotenv, parseEnv } from './config/env.js'
import { createLogger } from './utils/logger.js'

const defaultDatabase = {
  connect: connectDatabase,
  disconnect: disconnectDatabase,
  checkHealth: checkDatabaseHealth,
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, () => {
      server.off('error', reject)
      resolve()
    })
  })
}

/**
 * Démarre le serveur : connexion MongoDB d'abord, puis écoute HTTP seulement si la base est connectée.
 * En cas d'échec, tout ce qui a été ouvert est refermé et l'erreur est relancée.
 *
 * @param {object} options
 * @param {object} options.config configuration validée
 * @param {import('pino').Logger} options.logger
 * @param {typeof defaultDatabase} [options.database] accès à la base (remplaçable dans les tests)
 * @returns {Promise<{ app, server, port: number, shutdown: (reason?: string) => Promise<void> }>}
 */
export async function startServer({ config, logger, database = defaultDatabase }) {
  logger.info({ env: config.env, database: config.database.name }, 'Démarrage de l’API DUO CAPITAL')

  await database.connect({ url: config.database.url, requireReplicaSet: config.database.requireReplicaSet, logger })
  logger.info({ database: config.database.name }, 'MongoDB connecté')

  const app = createApp({ config, logger, database })
  const server = http.createServer(app)

  try {
    await listen(server, config.port)
  } catch (err) {
    await database.disconnect()
    throw err
  }

  const port = server.address().port
  logger.info({ port }, 'API prête')

  let shutdownPromise = null
  function shutdown(reason = 'manual') {
    if (shutdownPromise) return shutdownPromise

    shutdownPromise = (async () => {
      logger.info({ reason }, 'Arrêt en cours')
      const forceTimer = setTimeout(() => server.closeAllConnections?.(), SHUTDOWN_TIMEOUT_MS)
      forceTimer.unref()

      const closed = new Promise((resolve) => server.close(() => resolve()))
      server.closeIdleConnections?.()
      await closed
      clearTimeout(forceTimer)

      await database.disconnect()
      logger.info('Arrêt terminé')
    })()

    return shutdownPromise
  }

  return { app, server, port, shutdown }
}

function registerProcessHandlers({ shutdown, logger }) {
  const stop = (signal) => {
    shutdown(signal).then(
      () => process.exit(0),
      (err) => {
        logger.error({ err }, 'Arrêt en erreur')
        process.exit(1)
      },
    )
  }

  process.on('SIGINT', () => stop('SIGINT'))
  process.on('SIGTERM', () => stop('SIGTERM'))
  process.on('unhandledRejection', (err) => {
    logger.fatal({ err }, 'Promesse rejetée non gérée')
    shutdown('unhandledRejection').finally(() => process.exit(1))
  })
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Exception non gérée')
    shutdown('uncaughtException').finally(() => process.exit(1))
  })
}

async function main() {
  loadDotenv()

  let config
  try {
    config = parseEnv(process.env)
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message)
      process.exit(1)
    }
    throw err
  }

  const logger = createLogger({ level: config.logLevel, environment: config.env })

  try {
    const { shutdown } = await startServer({ config, logger })
    registerProcessHandlers({ shutdown, logger })
  } catch (err) {
    logger.fatal({ err }, 'Démarrage impossible')
    await disconnectDatabase().catch(() => {})
    process.exit(1)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
