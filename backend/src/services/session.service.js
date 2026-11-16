// Sessions d'authentification = modèle Session (B1). Une session = un refresh token émis ; chaque renouvellement
// révoque la session courante (ROTATED) et en crée une nouvelle dans la même famille. Présenter un refresh token
// Limite assumée : deux renouvellements simultanés avec le même refresh token (deux onglets) sont traités comme une

import { Session } from '../models/Session.js'
import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'
import { runInTransaction } from '../utils/transaction.js'
import { recordAudit } from './audit.service.js'
import { generateFamilyId, generateRefreshToken, hashRefreshToken, isWellFormedRefreshToken } from './token.service.js'

const invalidRefreshToken = () => new AppError({ status: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Session invalide. Veuillez vous reconnecter.' })
const sessionRevoked = () => new AppError({ status: 401, code: 'SESSION_REVOKED', message: 'Session terminée. Veuillez vous reconnecter.' })
const sessionExpired = () => new AppError({ status: 401, code: 'SESSION_EXPIRED', message: 'Session expirée. Veuillez vous reconnecter.' })

const truncate = (value, max) => (typeof value === 'string' && value.length > max ? value.slice(0, max) : (value ?? null))

/** Crée une session (et son refresh token en clair, à remettre au client une seule fois). */
export async function createSessionRecord({ userId, familyId = generateFamilyId(), ttlSeconds, meta = {}, now = new Date() }, { dbSession } = {}) {
  const refreshToken = generateRefreshToken()
  const [session] = await Session.create(
    [
      {
        user: userId,
        familyId,
        refreshTokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
        lastUsedAt: now,
        userAgent: truncate(meta.userAgent, 300),
        ipAddress: truncate(meta.ipAddress, 64),
      },
    ],
    { session: dbSession },
  )
  return { session, refreshToken }
}

/** Révoque une session si elle ne l'est pas déjà. */
export async function revokeSession(sessionId, reason, now = new Date()) {
  const result = await Session.updateOne({ _id: sessionId, revokedAt: null }, { $set: { revokedAt: now, revokedReason: reason } })
  return result.modifiedCount === 1
}

async function revokeFamilyAfterReuse(compromised, { meta, now }) {
  await Session.updateMany({ familyId: compromised.familyId, revokedAt: null }, { $set: { revokedAt: now, revokedReason: 'REUSE_DETECTED' } })
  await recordAudit({
    actor: compromised.user,
    action: 'SESSION_REUSE_DETECTED',
    resourceType: 'SESSION',
    resourceId: compromised._id,
    after: { familyId: compromised.familyId },
    meta,
  })
}

/**
 * Renouvelle une session à partir d'un refresh token : vérifie, tourne le token et retourne la nouvelle session.
 * @throws {AppError} 401 INVALID_REFRESH_TOKEN | SESSION_REVOKED | SESSION_EXPIRED
 */
export async function rotateSession({ refreshToken, ttlSeconds, meta = {}, now = new Date() }) {
  if (!isWellFormedRefreshToken(refreshToken)) throw invalidRefreshToken()

  const current = await Session.findOne({ refreshTokenHash: hashRefreshToken(refreshToken) })
  if (!current) throw invalidRefreshToken()

  if (current.revokedAt) {
    if (current.revokedReason === 'ROTATED') await revokeFamilyAfterReuse(current, { meta, now })
    throw sessionRevoked()
  }
  if (current.expiresAt.getTime() <= now.getTime()) throw sessionExpired()

  const user = await User.findById(current.user)
  if (!user || user.status !== 'ACTIVE') {
    await revokeSession(current._id, 'ACCOUNT_DISABLED', now)
    throw sessionRevoked()
  }

  const outcome = await runInTransaction(async (dbSession) => {
    // Conditionnel et atomique : un seul renouvellement peut révoquer cette session.
    const revoked = await Session.findOneAndUpdate(
      { _id: current._id, revokedAt: null },
      { $set: { revokedAt: now, revokedReason: 'ROTATED', lastUsedAt: now } },
      { session: dbSession },
    )
    if (!revoked) return { reused: true }

    const next = await createSessionRecord({ userId: user._id, familyId: current.familyId, ttlSeconds, meta, now }, { dbSession })
    await Session.updateOne({ _id: current._id }, { $set: { replacedBy: next.session._id } }, { session: dbSession })
    return { reused: false, ...next }
  })

  if (outcome.reused) {
    await revokeFamilyAfterReuse(current, { meta, now })
    throw sessionRevoked()
  }
  return { user, session: outcome.session, refreshToken: outcome.refreshToken }
}

/**
 * Déconnexion : révoque la session liée au refresh token. Idempotente (jeton inconnu ou session déjà révoquée : aucun effet, aucune erreur).
 * @returns {Promise<boolean>} vrai si une session active a été révoquée
 */
export async function logoutSession({ refreshToken, meta = {}, now = new Date() }) {
  if (!isWellFormedRefreshToken(refreshToken)) return false

  const session = await Session.findOne({ refreshTokenHash: hashRefreshToken(refreshToken) })
  if (!session || !(await revokeSession(session._id, 'LOGOUT', now))) return false

  await recordAudit({ actor: session.user, action: 'LOGOUT', resourceType: 'SESSION', resourceId: session._id, meta })
  return true
}

/**
 * Vérifie qu'un jeton d'accès correspond à une session toujours valide et à un utilisateur actif.
 * @returns {Promise<{ user, session }>}
 * @throws {AppError} 401 SESSION_REVOKED | SESSION_EXPIRED
 */
export async function findActiveSession({ sessionId, userId, now = new Date() }) {
  const session = await Session.findById(sessionId)
  if (!session || String(session.user) !== String(userId) || session.revokedAt) throw sessionRevoked()
  if (session.expiresAt.getTime() <= now.getTime()) throw sessionExpired()

  const user = await User.findById(userId)
  if (!user || user.status !== 'ACTIVE') throw sessionRevoked()
  return { user, session }
}
