import { Router } from 'express'
import { validateQuery } from '../middlewares/validateQuery.js'
import { sendSuccess } from '../utils/response.js'
import { statisticsQuerySchema } from '../validation/statistics.schemas.js'

/**
 * Route /api/v1/statistics (derrière `authenticate`), en LECTURE SEULE : une seule route GET, aucune écriture.
 * Les deux associés obtiennent exactement les mêmes statistiques ; aucune identité n'est lue dans la requête.
 *   GET /?period=week|month|last3months|last6months|year|all|custom[&from=AAAA-MM-JJ&to=AAAA-MM-JJ]
 */
export function createStatisticsRouter({ statisticsService }) {
  const router = Router()
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  router.get('/', validateQuery(statisticsQuerySchema), async (req, res) => sendSuccess(res, await statisticsService.getStatistics(req.validatedQuery)))

  return router
}
