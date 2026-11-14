import { Router } from 'express'
import { validateQuery } from '../middlewares/validateQuery.js'
import { AppError } from '../utils/AppError.js'
import { sendSuccess } from '../utils/response.js'
import { listHistoryQuerySchema } from '../validation/history.schemas.js'
import { movementTypeParamSchema } from '../validation/treasury.schemas.js'

/**
 * Routes /api/v1/history (derrière `authenticate`), en LECTURE SEULE : aucune route d'écriture n'existe. Les deux
 * associés voient exactement le même historique ; aucune identité n'est lue dans la requête.
 *   GET /summary        indicateurs globaux (entrées, sorties, solde net, totaux par type, résultat commercial)
 *   GET /               opérations : recherche, filtres, tri, pagination (page, limit)
 *   GET /:type/:id      détail d'une opération (type = CONTRIBUTION | REVENUE | INVESTMENT | EXPENSE | WITHDRAWAL)
 */
export function createHistoryRouter({ historyService }) {
  const router = Router()
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  router.get('/summary', async (_req, res) => sendSuccess(res, await historyService.summary()))

  router.get('/', validateQuery(listHistoryQuerySchema), async (req, res) => {
    const { operations, meta } = await historyService.list(req.validatedQuery)
    return sendSuccess(res, { operations }, { meta })
  })

  router.get('/:type/:id', async (req, res) => {
    const type = movementTypeParamSchema.safeParse(req.params.type)
    if (!type.success) throw new AppError({ status: 400, code: 'INVALID_OPERATION_TYPE', message: "Le type d'opération est invalide." })
    return sendSuccess(res, { operation: await historyService.detail(type.data, req.params.id) })
  })

  return router
}
