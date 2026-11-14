import { Router } from 'express'
import { createRateLimiter } from '../middlewares/rateLimiter.js'
import { validateBody } from '../middlewares/validateBody.js'
import { accountStatusSchema, changeEmailSchema, changePasswordSchema, updateProfileSchema } from '../validation/user.schemas.js'
import { sendSuccess } from '../utils/response.js'

const noStore = (_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
}

const clientMeta = (req) => ({ ipAddress: req.ip, requestId: req.id ? String(req.id) : undefined })
const actorOf = (req) => ({ userId: String(req.auth.user._id), sessionId: req.auth.session._id })

/**
 * Routes /api/v1/users (montées derrière `authenticate`). Aucune route de création ni de suppression :
 * les comptes sont créés par le script de provisioning (côté serveur) et ne se suppriment jamais.
 * Les deux associés ont exactement les mêmes routes et les mêmes droits.
 *
 * @param {object} options
 * @param {object} options.config
 * @param {ReturnType<import('../services/user.service.js').createUserService>} options.userService
 */
export function createUsersRouter({ config, userService }) {
  const router = Router()
  const sensitiveLimiter = createRateLimiter({
    ...config.auth.sensitiveActionRateLimit,
    skipSuccessfulRequests: true,
    code: 'TOO_MANY_ATTEMPTS',
    message: 'Trop de tentatives. Veuillez réessayer plus tard.',
  })

  router.use(noStore)

  router.get('/', async (_req, res) => sendSuccess(res, { users: await userService.listPartners() }))

  // Opérations sur SON propre compte (déclarées avant « /:id »).
  router.patch('/me', validateBody(updateProfileSchema), async (req, res) =>
    sendSuccess(res, { user: await userService.updateProfile({ actor: actorOf(req), name: req.body.name, meta: clientMeta(req) }) }),
  )

  router.patch('/me/email', sensitiveLimiter, validateBody(changeEmailSchema), async (req, res) =>
    sendSuccess(res, {
      user: await userService.changeEmail({ actor: actorOf(req), email: req.body.email, currentPassword: req.body.currentPassword, meta: clientMeta(req) }),
    }),
  )

  router.patch('/me/password', sensitiveLimiter, validateBody(changePasswordSchema), async (req, res) =>
    sendSuccess(
      res,
      await userService.changePassword({ actor: actorOf(req), currentPassword: req.body.currentPassword, newPassword: req.body.newPassword, meta: clientMeta(req) }),
    ),
  )

  router.get('/:id', async (req, res) => sendSuccess(res, { user: await userService.getPartner(req.params.id) }))

  // Désactivation / réactivation de l'AUTRE associé (confirmées par le mot de passe de l'auteur).
  for (const [action, status] of [['deactivate', 'DISABLED'], ['activate', 'ACTIVE']]) {
    router.post(`/:id/${action}`, sensitiveLimiter, validateBody(accountStatusSchema), async (req, res) =>
      sendSuccess(res, {
        user: await userService.setPartnerStatus({ actor: actorOf(req), targetId: req.params.id, status, currentPassword: req.body.currentPassword, meta: clientMeta(req) }),
      }),
    )
  }

  return router
}
