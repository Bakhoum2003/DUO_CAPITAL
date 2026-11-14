import { Router } from 'express'
import { validateBody } from '../middlewares/validateBody.js'
import { sendSuccess } from '../utils/response.js'
import { emptyBodySchema, updatePreferencesSchema, updateSettingsSchema } from '../validation/settings.schemas.js'

const clientMeta = (req) => ({ ipAddress: req.ip, requestId: req.id ? String(req.id) : undefined })
// L'identité vient UNIQUEMENT de la session authentifiée (req.auth, posé par `authenticate`) : aucun identifiant n'est lu dans la requête.
const actorOf = (req) => ({ userId: String(req.auth.user._id), name: req.auth.user.name })

/**
 * Routes /api/v1/settings (derrière `authenticate`).
 *   GET  /                          paramètres communs (identité, description, associés, objectifs, version)
 *   PUT  /                          modifie la description / les informations du projet (409 si la version attendue n'est plus la bonne)
 *   GET  /preferences               préférences de l'associé connecté
 *   PUT  /preferences               modifie SES préférences (partiel)
 *   POST /preferences/reset         remet SES préférences aux valeurs par défaut
 *   GET  /contribution-reminders    rappels de cotisation calculés à partir des vraies cotisations
 *   GET  /security                  informations de sécurité du compte et de ses sessions
 * Aucune route d'envoi d'email, aucune écriture financière.
 */
export function createSettingsRouter({ settingsService }) {
  const router = Router()
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  router.get('/', async (_req, res) => sendSuccess(res, await settingsService.getSettings()))

  router.put('/', validateBody(updateSettingsSchema), async (req, res) =>
    sendSuccess(res, await settingsService.updateSettings({ actor: actorOf(req), ...req.body, meta: clientMeta(req) })),
  )

  router.get('/preferences', async (req, res) => sendSuccess(res, { preferences: await settingsService.getPreferences({ userId: actorOf(req).userId }) }))

  router.put('/preferences', validateBody(updatePreferencesSchema), async (req, res) =>
    sendSuccess(res, { preferences: await settingsService.updatePreferences({ userId: actorOf(req).userId, changes: req.body }) }),
  )

  router.post('/preferences/reset', validateBody(emptyBodySchema), async (req, res) =>
    sendSuccess(res, { preferences: await settingsService.resetPreferences({ userId: actorOf(req).userId }) }),
  )

  router.get('/contribution-reminders', async (req, res) => sendSuccess(res, await settingsService.getContributionReminders({ userId: actorOf(req).userId })))

  router.get('/security', async (req, res) => sendSuccess(res, await settingsService.getSecurity({ userId: actorOf(req).userId, sessionId: req.auth.session._id })))

  return router
}
