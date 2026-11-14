import { Router } from 'express'
import { validateBody } from '../middlewares/validateBody.js'
import { validateQuery } from '../middlewares/validateQuery.js'
import { AppError } from '../utils/AppError.js'
import { sendSuccess } from '../utils/response.js'
import { createWithdrawalSchema, deleteWithdrawalSchema, listWithdrawalsQuerySchema, updateWithdrawalSchema } from '../validation/withdrawal.schemas.js'

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_\-:.]{8,128}$/
const noStore = (_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
}
const clientMeta = (req) => ({ ipAddress: req.ip, requestId: req.id ? String(req.id) : undefined })
const actorOf = (req) => ({ userId: String(req.auth.user._id), name: req.auth.user.name }) // l'auteur vient TOUJOURS de la session

function requireIdempotencyKey(req, _res, next) {
  const key = req.get('Idempotency-Key')
  if (!key || !IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new AppError({ status: 400, code: 'IDEMPOTENCY_KEY_REQUIRED', message: "L'en-tête Idempotency-Key (8 à 128 caractères) est obligatoire." })
  }
  req.idempotencyKey = key
  next()
}

/** Routes /api/v1/withdrawals (derrière `authenticate`). Mêmes routes et mêmes droits pour les deux associés. */
export function createWithdrawalsRouter({ withdrawalService }) {
  const router = Router()
  router.use(noStore)

  router.get('/summary', async (_req, res) => sendSuccess(res, await withdrawalService.summary()))

  router.get('/', validateQuery(listWithdrawalsQuerySchema), async (req, res) => {
    const { withdrawals, meta } = await withdrawalService.list(req.validatedQuery)
    return sendSuccess(res, { withdrawals }, { meta })
  })

  router.get('/:id', async (req, res) => sendSuccess(res, { withdrawal: await withdrawalService.get(req.params.id) }))

  router.post('/', requireIdempotencyKey, validateBody(createWithdrawalSchema), async (req, res) => {
    const result = await withdrawalService.create({ actor: actorOf(req), body: req.body, idempotencyKey: req.idempotencyKey, meta: clientMeta(req) })
    if (result.replayed) res.set('Idempotent-Replayed', 'true')
    return res.status(result.statusCode).json(result.body)
  })

  router.patch('/:id', validateBody(updateWithdrawalSchema), async (req, res) => {
    const { withdrawal, changed } = await withdrawalService.update({ actor: actorOf(req), id: req.params.id, changes: req.body, meta: clientMeta(req) })
    return sendSuccess(res, { withdrawal, changed })
  })

  router.delete('/:id', validateBody(deleteWithdrawalSchema), async (req, res) => {
    return sendSuccess(res, await withdrawalService.remove({ actor: actorOf(req), id: req.params.id, reason: req.body.reason, meta: clientMeta(req) }))
  })

  return router
}
