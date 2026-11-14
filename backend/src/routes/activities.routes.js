import { Router } from 'express'
import { validateBody } from '../middlewares/validateBody.js'
import { validateQuery } from '../middlewares/validateQuery.js'
import { sendSuccess } from '../utils/response.js'
import {
  completeActivitySchema,
  createActivitySchema,
  emptyActionSchema,
  listActivitiesQuerySchema,
  reopenActivitySchema,
  updateActivitySchema,
} from '../validation/activity.schemas.js'

const noStore = (_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
}
const clientMeta = (req) => ({ ipAddress: req.ip, requestId: req.id ? String(req.id) : undefined })
const actorOf = (req) => ({ userId: String(req.auth.user._id), name: req.auth.user.name })

const TRANSITION_SCHEMAS = {
  suspend: emptyActionSchema,
  reactivate: emptyActionSchema,
  complete: completeActivitySchema,
  reopen: reopenActivitySchema,
  archive: emptyActionSchema,
}

/**
 * Routes /api/v1/activities (derrière `authenticate`). Mêmes routes et mêmes droits pour les deux associés.
 * Aucune route de suppression : une activité s'archive, son historique financier est conservé.
 */
export function createActivitiesRouter({ activityService }) {
  const router = Router()
  router.use(noStore)

  router.get('/', validateQuery(listActivitiesQuerySchema), async (req, res) => {
    const { activities, meta } = await activityService.list(req.validatedQuery)
    return sendSuccess(res, { activities }, { meta })
  })

  router.post('/', validateBody(createActivitySchema), async (req, res) =>
    sendSuccess(res, { activity: await activityService.create({ actor: actorOf(req), body: req.body, meta: clientMeta(req) }) }, { status: 201 }),
  )

  router.get('/:id', async (req, res) => sendSuccess(res, { activity: await activityService.get(req.params.id) }))

  router.patch('/:id', validateBody(updateActivitySchema), async (req, res) =>
    sendSuccess(res, { activity: await activityService.update({ id: req.params.id, actor: actorOf(req), body: req.body, meta: clientMeta(req) }) }),
  )

  for (const [action, schema] of Object.entries(TRANSITION_SCHEMAS)) {
    router.post(`/:id/${action}`, validateBody(schema), async (req, res) =>
      sendSuccess(res, { activity: await activityService.transition({ id: req.params.id, action, actor: actorOf(req), body: req.body, meta: clientMeta(req) }) }),
    )
  }

  return router
}
