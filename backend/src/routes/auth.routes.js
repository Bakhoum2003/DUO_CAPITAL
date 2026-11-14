import { Router } from 'express'
import { REFRESH_COOKIE_NAME } from '../config/constants.js'
import { createAuthenticate } from '../middlewares/authenticate.js'
import { createRateLimiter } from '../middlewares/rateLimiter.js'
import { validateBody } from '../middlewares/validateBody.js'
import { toPublicUser } from '../services/auth.service.js'
import { loginSchema } from '../validation/auth.schemas.js'
import { clearAuthCookies, parseCookies, setAuthCookies } from '../utils/cookies.js'
import { sendSuccess } from '../utils/response.js'

const noStore = (_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
}

const clientMeta = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent'), requestId: req.id ? String(req.id) : undefined })
const readRefreshToken = (req) => parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME]

/**
 * Routes /api/auth : login, refresh, logout, me. Aucune route d'inscription : les comptes sont créés
 * par un processus contrôlé (phase B3), jamais par l'API.
 * Les jetons voyagent uniquement dans des cookies HttpOnly ; les réponses JSON n'en contiennent jamais.
 *
 * @param {object} options
 * @param {object} options.config
 * @param {ReturnType<import('../services/auth.service.js').createAuthService>} options.authService
 * @param {() => Date} [options.clock]
 */
export function createAuthRouter({ config, authService, clock = () => new Date() }) {
  const router = Router()
  const authenticate = createAuthenticate({ config, clock })
  const loginLimiter = createRateLimiter({
    ...config.auth.loginRateLimit,
    skipSuccessfulRequests: true,
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Trop de tentatives de connexion. Veuillez réessayer plus tard.',
  })

  router.use(noStore)

  router.post('/login', loginLimiter, validateBody(loginSchema), async (req, res) => {
    const result = await authService.login({ email: req.body.email, password: req.body.password, meta: clientMeta(req) })
    setAuthCookies(res, result, config.cookies, clock())
    return sendSuccess(res, { user: result.user, accessExpiresAt: result.accessExpiresAt, refreshExpiresAt: result.refreshExpiresAt })
  })

  router.post('/refresh', async (req, res) => {
    try {
      const result = await authService.refresh({ refreshToken: readRefreshToken(req), meta: clientMeta(req) })
      setAuthCookies(res, result, config.cookies, clock())
      return sendSuccess(res, { user: result.user, accessExpiresAt: result.accessExpiresAt, refreshExpiresAt: result.refreshExpiresAt })
    } catch (err) {
      clearAuthCookies(res, config.cookies) // le navigateur cesse d'envoyer un jeton devenu inutilisable
      throw err
    }
  })

  router.post('/logout', async (req, res) => {
    await authService.logout({ refreshToken: readRefreshToken(req), meta: clientMeta(req) })
    clearAuthCookies(res, config.cookies)
    return sendSuccess(res, { loggedOut: true })
  })

  router.get('/me', authenticate, (req, res) => sendSuccess(res, { user: toPublicUser(req.auth.user) }))

  return router
}
