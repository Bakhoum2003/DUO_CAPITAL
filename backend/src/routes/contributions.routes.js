import { Router } from 'express'
import { validateBody } from '../middlewares/validateBody.js'
import { validateQuery } from '../middlewares/validateQuery.js'
import { AppError } from '../utils/AppError.js'
import { sendSuccess } from '../utils/response.js'
import { createContributionSchema, listContributionsQuerySchema } from '../validation/contribution.schemas.js'

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_\-:.]{8,128}$/
const noStore = (_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
}
const clientMeta = (req) => ({ ipAddress: req.ip, requestId: req.id ? String(req.id) : undefined })

function requireIdempotencyKey(req, _res, next) {
  const key = req.get('Idempotency-Key')
  if (!key || !IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new AppError({ status: 400, code: 'IDEMPOTENCY_KEY_REQUIRED', message: "L'en-tête Idempotency-Key (8 à 128 caractères) est obligatoire." })
  }
  req.idempotencyKey = key
  next()
}

/**
 * Routes /api/v1/contributions (derrière `authenticate`). Mêmes routes et mêmes droits pour les deux associés.
 * Volontairement AUCUNE route de modification ni de suppression : une cotisation est un mouvement réel immuable.
 */
export function createContributionsRouter({ contributionService }) {
  const router = Router()
  router.use(noStore)

  router.get('/summary', async (_req, res) => sendSuccess(res, await contributionService.summary()))

  router.get('/', validateQuery(listContributionsQuerySchema), async (req, res) => {
    const { contributions, meta } = await contributionService.list(req.validatedQuery)
    return sendSuccess(res, { contributions }, { meta })
  })

  router.get('/:id', async (req, res) => sendSuccess(res, { contribution: await contributionService.get(req.params.id) }))

  router.post('/', requireIdempotencyKey, validateBody(createContributionSchema), async (req, res) => {
    const result = await contributionService.create({
      actor: { userId: String(req.auth.user._id), name: req.auth.user.name },
      body: req.body,
      idempotencyKey: req.idempotencyKey,
      meta: clientMeta(req),
    })
    if (result.replayed) res.set('Idempotent-Replayed', 'true')
    return res.status(result.statusCode).json(result.body)
  })

  return router
}
