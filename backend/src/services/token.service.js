import { createHash, randomBytes, randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { AppError } from '../utils/AppError.js'

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/
const REFRESH_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/ // 32 octets aléatoires en base64url

const tokenError = (code, message) => new AppError({ status: 401, code, message })

/**
 * Jeton d'accès JWT (HS256) de courte durée. Contient seulement l'utilisateur (sub), la session (sid) et le type.
 * @param {{ userId: unknown, sessionId: unknown }} claims
 * @param {object} auth configuration d'authentification (config.auth)
 * @param {Date} [now]
 */
export function signAccessToken({ userId, sessionId }, auth, now = new Date()) {
  const issuedAt = Math.floor(now.getTime() / 1000)
  const payload = { sub: String(userId), sid: String(sessionId), typ: 'access', iat: issuedAt, exp: issuedAt + auth.accessTokenTtlSeconds }
  const token = jwt.sign(payload, auth.jwtSecret, { algorithm: 'HS256', issuer: auth.issuer, audience: auth.audience })
  return { token, expiresAt: new Date(payload.exp * 1000) }
}

/**
 * Vérifie un jeton d'accès : signature HS256 (aucun autre algorithme), émetteur, audience, expiration, type et forme.
 * @throws {AppError} 401 TOKEN_EXPIRED ou INVALID_TOKEN
 */
export function verifyAccessToken(token, auth, now = new Date()) {
  let payload
  try {
    payload = jwt.verify(token, auth.jwtSecret, {
      algorithms: ['HS256'],
      issuer: auth.issuer,
      audience: auth.audience,
      clockTimestamp: Math.floor(now.getTime() / 1000),
      clockTolerance: 0,
    })
  } catch (err) {
    if (err?.name === 'TokenExpiredError') throw tokenError('TOKEN_EXPIRED', 'Votre session a expiré. Veuillez vous reconnecter.')
    throw tokenError('INVALID_TOKEN', 'Authentification invalide.')
  }

  const valid =
    payload.typ === 'access' &&
    typeof payload.sub === 'string' && OBJECT_ID_PATTERN.test(payload.sub) &&
    typeof payload.sid === 'string' && OBJECT_ID_PATTERN.test(payload.sid)
  if (!valid) throw tokenError('INVALID_TOKEN', 'Authentification invalide.')

  return { userId: payload.sub, sessionId: payload.sid, expiresAt: new Date(payload.exp * 1000) }
}

/** Refresh token : 256 bits aléatoires, opaque. Seul son hash SHA-256 est enregistré en base. */
export function generateRefreshToken() {
  return randomBytes(32).toString('base64url')
}

export function hashRefreshToken(refreshToken) {
  return createHash('sha256').update(refreshToken, 'utf8').digest('hex')
}

/** Contrôle de forme avant toute requête en base (rejette les valeurs absentes, trop longues ou exotiques). */
export function isWellFormedRefreshToken(value) {
  return typeof value === 'string' && REFRESH_TOKEN_PATTERN.test(value)
}

export function generateFamilyId() {
  return randomUUID()
}
