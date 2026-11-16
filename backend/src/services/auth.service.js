import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'
import { runInTransaction } from '../utils/transaction.js'
import { recordAudit } from './audit.service.js'
import { verifyAgainstDummyHash, verifyPassword } from './password.service.js'
import { createSessionRecord, logoutSession, rotateSession } from './session.service.js'
import { signAccessToken } from './token.service.js'

export const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase()

/** Informations publiques d'un utilisateur : jamais d'empreinte de mot de passe, de compteur ni de verrou. */
export function toPublicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email, partnerNumber: user.partnerNumber }
}

// Même réponse pour un email inconnu, un mot de passe faux, un compte désactivé ou verrouillé : rien n'est révélé.
const invalidCredentials = () => new AppError({ status: 401, code: 'INVALID_CREDENTIALS', message: 'Email ou mot de passe incorrect.' })

/**
 * Service d'authentification. Ne connaît ni Express ni les cookies : il reçoit des valeurs et retourne des valeurs.
 * @param {object} options
 * @param {{ auth: object }} options.config
 * @param {import('pino').Logger} options.logger
 * @param {() => Date} [options.clock] horloge (remplaçable dans les tests)
 */
export function createAuthService({ config, logger, clock = () => new Date() }) {
  const { auth } = config

  function issueTokens({ user, session, refreshToken }, now) {
    const access = signAccessToken({ userId: user._id, sessionId: session._id }, auth, now)
    return {
      user: toPublicUser(user),
      accessToken: access.token,
      accessExpiresAt: access.expiresAt,
      refreshToken,
      refreshExpiresAt: session.expiresAt,
    }
  }

  async function registerFailedLogin(user, meta, now) {
    const updated = await User.findOneAndUpdate({ _id: user._id }, { $inc: { failedLoginAttempts: 1 } }, { new: true })
    await recordAudit({ actor: user._id, actorName: user.name, action: 'LOGIN_FAILED', resourceType: 'USER', resourceId: user._id, meta })

    if (updated && updated.failedLoginAttempts >= auth.maxFailedLogins) {
      const lockedUntil = new Date(now.getTime() + auth.lockDurationMs)
      await User.updateOne({ _id: user._id, failedLoginAttempts: { $gte: auth.maxFailedLogins } }, { $set: { lockedUntil, failedLoginAttempts: 0 } })
      await recordAudit({ actor: user._id, actorName: user.name, action: 'ACCOUNT_LOCKED', resourceType: 'USER', resourceId: user._id, after: { lockedUntil }, meta })
      logger.warn({ userId: String(user._id) }, 'Compte verrouillé après des échecs de connexion répétés')
    }
  }

  return {
    async login({ email, password, meta = {} }) {
      const now = clock()
      const user = await User.findOne({ email: normalizeEmail(email) }).select('+passwordHash')

      if (!user) {
        await verifyAgainstDummyHash(password) // même temps de réponse qu'avec un compte existant
        throw invalidCredentials()
      }

      const passwordMatches = await verifyPassword(user.passwordHash, password)
      const isLocked = user.lockedUntil != null && user.lockedUntil.getTime() > now.getTime()
      if (user.status !== 'ACTIVE' || isLocked) throw invalidCredentials()
      if (!passwordMatches) {
        await registerFailedLogin(user, meta, now)
        throw invalidCredentials()
      }

      const created = await runInTransaction(async (dbSession) => {
        const result = await createSessionRecord({ userId: user._id, ttlSeconds: auth.refreshTokenTtlSeconds, meta, now }, { dbSession })
        await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now } }, { session: dbSession })
        await recordAudit(
          { actor: user._id, actorName: user.name, action: 'LOGIN_SUCCEEDED', resourceType: 'USER', resourceId: user._id, after: { sessionId: String(result.session._id) }, meta },
          { dbSession },
        )
        return result
      })

      return issueTokens({ user, ...created }, now)
    },

    async refresh({ refreshToken, meta = {} }) {
      const now = clock()
      const rotated = await rotateSession({ refreshToken, ttlSeconds: auth.refreshTokenTtlSeconds, meta, now })
      return issueTokens(rotated, now)
    },

    async logout({ refreshToken, meta = {} }) {
      return logoutSession({ refreshToken, meta, now: clock() })
    },
  }
}
