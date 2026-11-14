import { Router } from 'express'
import { validateQuery } from '../middlewares/validateQuery.js'
import { AppError } from '../utils/AppError.js'
import { sendSuccess } from '../utils/response.js'
import { listMovementsQuerySchema, movementTypeParamSchema } from '../validation/treasury.schemas.js'

/**
 * Routes /api/v1/treasury (derrière `authenticate`), en LECTURE SEULE. Les deux associés voient exactement la même
 * trésorerie commune ; aucune identité n'est lue dans la requête.
 *   GET /summary                 solde, entrées, sorties, totaux par type, évolution, décomposition du calcul
 *   GET /movements               historique filtré, trié et paginé
 *   GET /movements/:type/:id     détail d'un mouvement (type = CONTRIBUTION | REVENUE | INVESTMENT | EXPENSE | WITHDRAWAL)
 */
export function createTreasuryRouter({ treasuryService }) {
  const router = Router()
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  router.get('/summary', async (_req, res) => sendSuccess(res, await treasuryService.getSummary()))

  router.get('/movements', validateQuery(listMovementsQuerySchema), async (req, res) => {
    const { movements, meta } = await treasuryService.listMovements(req.validatedQuery)
    return sendSuccess(res, { movements }, { meta })
  })

  router.get('/movements/:type/:id', async (req, res) => {
    const type = movementTypeParamSchema.safeParse(req.params.type)
    if (!type.success) throw new AppError({ status: 400, code: 'INVALID_MOVEMENT_TYPE', message: 'Le type de mouvement est invalide.' })
    return sendSuccess(res, { movement: await treasuryService.getMovement(type.data, req.params.id) })
  })

  return router
}
