import { Router } from 'express'
import { sendSuccess } from '../utils/response.js'

/**
 * GET /api/health : état du serveur ET de la base de données.
 * - serveur démarré + base connectée (ping réussi) -> 200, status « ok » ;
 * - serveur démarré mais base absente ou muette   -> 503, status « degraded ».
 * Aucune information sensible n'est renvoyée (ni adresse de base, ni identifiants, ni version, ni chemin).
 *
 * @param {object} options
 * @param {{ env: string }} options.config
 * @param {{ checkHealth: () => Promise<{ status: string, transactions: boolean | null }> }} options.database
 */
export function createHealthRouter({ config, database }) {
  const router = Router()

  router.get('/', async (_req, res) => {
    const databaseHealth = await database.checkHealth()
    const isHealthy = databaseHealth.status === 'connected'

    res.set('Cache-Control', 'no-store')
    return sendSuccess(
      res,
      {
        status: isHealthy ? 'ok' : 'degraded',
        environment: config.env,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        server: { status: 'up' },
        database: { status: databaseHealth.status, transactions: databaseHealth.transactions },
      },
      { status: isHealthy ? 200 : 503 },
    )
  })

  return router
}
