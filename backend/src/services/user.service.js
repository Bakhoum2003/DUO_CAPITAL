// - nom, email et mot de passe : modifiables par leur propriétaire uniquement ;
// - email, mot de passe, activation/désactivation : confirmation par le mot de passe actuel de l'auteur ;
// - désactiver l'AUTRE associé est possible, se désactiver soi-même ne l'est pas : au moins un compte reste toujours actif ;
// - un compte ne se supprime jamais (le modèle l'interdit) ; la désactivation conserve toutes les données ;
// - changer l'email ou le mot de passe révoque toutes les AUTRES sessions de l'utilisateur (la session courante reste ouverte).

import { Session } from '../models/Session.js'
import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'
import { runInTransaction } from '../utils/transaction.js'
import { getPasswordIssues } from '../validation/passwordPolicy.js'
import { recordAudit } from './audit.service.js'
import { normalizeEmail } from './auth.service.js'
import { hashPassword, verifyPassword } from './password.service.js'
import { toPartnerView } from './userView.js'

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/

const userNotFound = () => new AppError({ status: 404, code: 'USER_NOT_FOUND', message: 'Associé introuvable.' })
const emailAlreadyUsed = () => new AppError({ status: 409, code: 'EMAIL_ALREADY_USED', message: 'Cette adresse email est déjà utilisée.' })

/**
 * @param {object} options
 * @param {() => Date} [options.clock]
 */
export function createUserService({ clock = () => new Date() } = {}) {
  async function findPartner(id) {
    if (typeof id !== 'string' || !OBJECT_ID_PATTERN.test(id)) throw userNotFound()
    const user = await User.findById(id)
    if (!user) throw userNotFound()
    return user
  }

  // Confirmation de l'identité de l'auteur avant une opération sensible.
  async function assertCurrentPassword(userId, currentPassword) {
    const user = await User.findById(userId).select('+passwordHash')
    if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
      throw new AppError({ status: 403, code: 'INVALID_CURRENT_PASSWORD', message: 'Mot de passe actuel incorrect.' })
    }
    return user
  }

  // Révoque les sessions encore actives d'un utilisateur, sauf éventuellement la session courante.
  function revokeSessions({ userId, exceptSessionId = null, reason, now, dbSession }) {
    const filter = { user: userId, revokedAt: null }
    if (exceptSessionId) filter._id = { $ne: exceptSessionId }
    return Session.updateMany(filter, { $set: { revokedAt: now, revokedReason: reason } }, { session: dbSession })
  }

  return {
    async listPartners() {
      const users = await User.find().sort({ partnerNumber: 1 })
      return users.map(toPartnerView)
    },

    async getPartner(id) {
      return toPartnerView(await findPartner(id))
    },

    async updateProfile({ actor, name, meta = {} }) {
      const user = await findPartner(String(actor.userId))
      if (user.name === name) return toPartnerView(user)

      const before = { name: user.name }
      user.name = name
      await user.save()
      await recordAudit({ actor: user._id, actorName: name, action: 'USER_PROFILE_UPDATED', resourceType: 'USER', resourceId: user._id, before, after: { name }, meta })
      return toPartnerView(user)
    },

    /** Change l'email (unicité contrôlée) ; les autres sessions sont révoquées. */
    async changeEmail({ actor, email, currentPassword, meta = {} }) {
      const user = await assertCurrentPassword(actor.userId, currentPassword)
      const newEmail = normalizeEmail(email)
      if (newEmail === user.email) throw new AppError({ status: 409, code: 'EMAIL_UNCHANGED', message: "C'est déjà votre adresse email." })
      if (await User.exists({ email: newEmail })) throw emailAlreadyUsed()

      const now = clock()
      try {
        await runInTransaction(async (dbSession) => {
          await User.updateOne({ _id: user._id }, { $set: { email: newEmail } }, { session: dbSession })
          await revokeSessions({ userId: user._id, exceptSessionId: actor.sessionId, reason: 'MANUAL', now, dbSession })
          await recordAudit(
            { actor: user._id, actorName: user.name, action: 'USER_EMAIL_CHANGED', resourceType: 'USER', resourceId: user._id, before: { email: user.email }, after: { email: newEmail }, meta },
            { dbSession },
          )
        })
      } catch (err) {
        if (err?.code === 11000) throw emailAlreadyUsed() // course entre deux demandes : l'index unique tranche
        throw err
      }
      return toPartnerView(await findPartner(String(user._id)))
    },

    /** Change le mot de passe (Argon2id, politique de mot de passe) ; les autres sessions sont révoquées. */
    async changePassword({ actor, currentPassword, newPassword, meta = {} }) {
      const user = await assertCurrentPassword(actor.userId, currentPassword)

      const issues = getPasswordIssues(newPassword, { email: user.email, name: user.name })
      if (issues.length === 0 && newPassword === currentPassword) issues.push("Le nouveau mot de passe doit différer de l'actuel.")
      if (issues.length > 0) {
        throw new AppError({
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'Les données envoyées sont invalides.',
          fields: issues.map((message) => ({ field: 'newPassword', message })),
        })
      }

      const passwordHash = await hashPassword(newPassword)
      const now = clock()
      await runInTransaction(async (dbSession) => {
        await User.updateOne(
          { _id: user._id },
          { $set: { passwordHash, passwordChangedAt: now, mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null } },
          { session: dbSession },
        )
        await revokeSessions({ userId: user._id, exceptSessionId: actor.sessionId, reason: 'PASSWORD_CHANGED', now, dbSession })
        await recordAudit({ actor: user._id, actorName: user.name, action: 'USER_PASSWORD_CHANGED', resourceType: 'USER', resourceId: user._id, meta }, { dbSession })
      })
      return { changed: true }
    },

    /**
     * Active ou désactive l'AUTRE associé. Désactiver : révoque toutes ses sessions et bloque toute nouvelle connexion.
     * Rien n'est supprimé : cotisations, opérations, retraits et historique restent intacts.
     */
    async setPartnerStatus({ actor, targetId, status, currentPassword, meta = {} }) {
      if (String(actor.userId) === targetId) {
        throw new AppError({ status: 409, code: 'CANNOT_CHANGE_OWN_STATUS', message: 'Vous ne pouvez pas modifier le statut de votre propre compte.' })
      }
      await assertCurrentPassword(actor.userId, currentPassword)

      const target = await findPartner(targetId)
      if (target.status === status) return toPartnerView(target) // déjà dans cet état : aucune écriture

      const now = clock()
      await runInTransaction(async (dbSession) => {
        const changes = status === 'ACTIVE' ? { status, failedLoginAttempts: 0, lockedUntil: null } : { status }
        await User.updateOne({ _id: target._id }, { $set: changes }, { session: dbSession })
        if (status === 'DISABLED') await revokeSessions({ userId: target._id, reason: 'ACCOUNT_DISABLED', now, dbSession })
        await recordAudit(
          {
            actor: actor.userId,
            action: status === 'DISABLED' ? 'USER_DEACTIVATED' : 'USER_ACTIVATED',
            resourceType: 'USER',
            resourceId: target._id,
            before: { status: target.status },
            after: { status },
            meta,
          },
          { dbSession },
        )
      })
      return toPartnerView(await findPartner(targetId))
    },
  }
}
