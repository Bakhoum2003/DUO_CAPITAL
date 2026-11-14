import { ACCESS_COOKIE_NAME } from '../config/constants.js'
import { findActiveSession } from '../services/session.service.js'
import { verifyAccessToken } from '../services/token.service.js'
import { AppError } from '../utils/AppError.js'
import { parseCookies } from '../utils/cookies.js'

/**
 * Protège une route privée. Le jeton d'accès est lu UNIQUEMENT dans le cookie HttpOnly. À chaque requête :
 * signature et expiration du JWT, puis session non révoquée et non expirée, puis utilisateur actif en base.
 * Succès : `req.auth = { user, session }`. Échec : 401 (UNAUTHENTICATED, INVALID_TOKEN, TOKEN_EXPIRED, SESSION_REVOKED, SESSION_EXPIRED).
 *
 * @param {{ auth: object }} config
 * @param {() => Date} [clock]
 */
export function createAuthenticate({ config, clock = () => new Date() }) {
  return async function authenticate(req, _res, next) {
    const token = parseCookies(req.headers.cookie)[ACCESS_COOKIE_NAME]
    if (!token) throw new AppError({ status: 401, code: 'UNAUTHENTICATED', message: 'Authentification requise.' })

    const now = clock()
    const { userId, sessionId } = verifyAccessToken(token, config.auth, now)
    req.auth = await findActiveSession({ sessionId, userId, now })
    next()
  }
}
