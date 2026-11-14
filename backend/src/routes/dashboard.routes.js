import { Router } from 'express'
import { validateQuery } from '../middlewares/validateQuery.js'
import { sendSuccess } from '../utils/response.js'
import { dashboardQuerySchema } from '../validation/dashboard.schemas.js'

/**
 * GET /api/v1/dashboard?period=today|week|month|quarter|year|all|custom[&from=AAAA-MM-JJ&to=AAAA-MM-JJ]
 * Une seule réponse cohérente (vue d'ensemble, cotisations, capital, investissements, dépenses, recettes, résultat,
 * trésorerie, graphiques, activités récentes). Montée derrière `authenticate` : les deux associés voient les mêmes
 * données communes ; l'identité vient de la session, jamais d'un paramètre.
 */
export function createDashboardRouter({ dashboardService }) {
  const router = Router()

  router.get('/', validateQuery(dashboardQuerySchema), async (req, res) => {
    res.set('Cache-Control', 'no-store')
    return sendSuccess(res, await dashboardService.getDashboard(req.validatedQuery))
  })

  return router
}
