// calculés à partir des vraies cotisations, et informations de sécurité du compte. AUCUNE écriture financière, AUCUN envoi d'email.

import { BUSINESS_TIME_ZONE, CURRENCY_CODE, MONTHLY_CONTRIBUTION_PER_PARTNER } from '../config/constants.js'
import { PARTNER_COUNT } from '../config/partners.js'
import { Contribution } from '../models/Contribution.js'
import { FundSettings } from '../models/FundSettings.js'
import { Session } from '../models/Session.js'
import { User } from '../models/User.js'
import { UserPreferences } from '../models/UserPreferences.js'
import {
  APP_IDENTITY,
  DEFAULT_FUND_SETTINGS,
  DEFAULT_USER_PREFERENCES,
  FUND_DESCRIPTION_MAX_LENGTH,
  FUND_DESCRIPTION_MIN_LENGTH,
  FUND_PROJECT_INFO_MAX_LENGTH,
  FUND_SETTINGS_ID,
} from '../models/shared/constants.js'
import { AppError } from '../utils/AppError.js'
import { todayInBusinessZone } from '../utils/businessDates.js'
import { runInTransaction } from '../utils/transaction.js'
import { recordAudit } from './audit.service.js'
import { computeContributionSummary } from './contributions/summary.js'
import { buildContributionReminders } from './settings/reminders.js'
import { toPartnerView } from './userView.js'

const MAX_LISTED_SESSIONS = 20

const versionConflict = () =>
  new AppError({
    status: 409,
    code: 'SETTINGS_VERSION_CONFLICT',
    message: 'Ces informations ont été modifiées entre-temps par un associé. Rechargez la page pour voir la dernière version, puis refaites votre modification.',
  })

const isDuplicateKey = (error) => error?.code === 11000

function toFundView(document, authorsById) {
  if (!document) {
    return { ...DEFAULT_FUND_SETTINGS, version: 0, isDefault: true, updatedAt: null, updatedBy: null }
  }
  const author = authorsById.get(String(document.updatedBy))
  return {
    description: document.description,
    projectInfo: document.projectInfo ?? '',
    version: document.version,
    isDefault: false,
    updatedAt: document.updatedAt ?? null,
    updatedBy: author ? { id: String(document.updatedBy), name: author.name, partnerNumber: author.partnerNumber } : { id: String(document.updatedBy), name: null, partnerNumber: null },
  }
}

function toPreferencesView(document) {
  return {
    theme: document?.theme ?? DEFAULT_USER_PREFERENCES.theme,
    amountSeparator: document?.amountSeparator ?? DEFAULT_USER_PREFERENCES.amountSeparator,
    visualNotificationsEnabled: document?.visualNotificationsEnabled ?? DEFAULT_USER_PREFERENCES.visualNotificationsEnabled,
    contributionRemindersEnabled: document?.contributionRemindersEnabled ?? DEFAULT_USER_PREFERENCES.contributionRemindersEnabled,
    isDefault: !document,
    updatedAt: document?.updatedAt ?? null,
    emailNotifications: { available: false, enabled: false }, // fonctionnalité non disponible : aucun envoi, aucun réglage
  }
}

/**
 * @param {object} deps
 * @param {{ fund: { startPeriod: string | null }, auth: { accessTokenTtlSeconds: number, refreshTokenTtlSeconds: number } }} deps.config
 * @param {() => Date} [deps.clock]
 */
export function createSettingsService({ config, clock = () => new Date() }) {
  async function loadFund(dbSession) {
    const query = FundSettings.findById(FUND_SETTINGS_ID).lean()
    return dbSession ? query.session(dbSession) : query
  }

  async function upsertPreferences(userId, changes) {
    const run = () =>
      UserPreferences.findOneAndUpdate({ user: userId }, { $set: changes }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).lean()
    try {
      return await run()
    } catch (error) {
      if (!isDuplicateKey(error)) throw error
      return run() // deux premières écritures simultanées : la seconde met à jour le document créé par la première
    }
  }

  return {
    async getSettings() {
      const [fund, users] = await Promise.all([loadFund(), User.find({}, { name: 1, email: 1, partnerNumber: 1, status: 1 }).sort({ partnerNumber: 1 }).lean()])
      const authors = new Map(users.map((user) => [String(user._id), user]))
      return {
        identity: { name: APP_IDENTITY.name, slogan: APP_IDENTITY.slogan, currencyCode: CURRENCY_CODE, currencyLabel: APP_IDENTITY.currencyLabel, timeZone: BUSINESS_TIME_ZONE },
        fund: toFundView(fund, authors),
        partners: users.map((user) => {
          const { id, name, email, partnerNumber, status } = toPartnerView(user)
          return { id, name, email, partnerNumber, status }
        }),
        objectives: {
          monthlyPerPartner: MONTHLY_CONTRIBUTION_PER_PARTNER,
          monthlyCollective: MONTHLY_CONTRIBUTION_PER_PARTNER * PARTNER_COUNT,
          fundStartPeriod: config.fund.startPeriod,
        },
        editableFields: ['description', 'projectInfo'],
        limits: { descriptionMin: FUND_DESCRIPTION_MIN_LENGTH, descriptionMax: FUND_DESCRIPTION_MAX_LENGTH, projectInfoMax: FUND_PROJECT_INFO_MAX_LENGTH },
      }
    },

    /**
     * Modifie la description et/ou les informations du projet. `expectedVersion` doit être la version courante (0 = aucun document encore) :
     * sinon 409. Une modification identique à l'état courant n'écrit rien (ni version, ni audit).
     * @param {{ actor: { userId: string, name: string }, expectedVersion: number, description?: string, projectInfo?: string, meta?: object }} input
     */
    async updateSettings({ actor, expectedVersion, description, projectInfo, meta }) {
      try {
        return await runInTransaction(async (dbSession) => {
          const current = await loadFund(dbSession)
          if ((current?.version ?? 0) !== expectedVersion) throw versionConflict()

          const before = { description: current?.description ?? DEFAULT_FUND_SETTINGS.description, projectInfo: current ? (current.projectInfo ?? '') : DEFAULT_FUND_SETTINGS.projectInfo }
          const after = { description: description ?? before.description, projectInfo: projectInfo ?? before.projectInfo }
          const users = await User.find({}, { name: 1, partnerNumber: 1 }).session(dbSession).lean()
          const authors = new Map(users.map((user) => [String(user._id), user]))

          if (after.description === before.description && after.projectInfo === before.projectInfo) {
            return { fund: toFundView(current, authors), changed: false }
          }

          let saved
          if (!current) {
            ;[saved] = await FundSettings.create([{ ...after, version: 1, updatedBy: actor.userId }], { session: dbSession })
            saved = saved.toObject()
          } else {
            saved = await FundSettings.findOneAndUpdate(
              { _id: FUND_SETTINGS_ID, version: expectedVersion },
              { $set: { ...after, updatedBy: actor.userId }, $inc: { version: 1 } },
              { new: true, runValidators: true, session: dbSession },
            ).lean()
            if (!saved) throw versionConflict()
          }

          await recordAudit(
            {
              actor: actor.userId,
              actorName: actor.name,
              action: 'SETTINGS_UPDATED',
              resourceType: 'SETTINGS',
              resourceId: FUND_SETTINGS_ID,
              before: { ...before, version: expectedVersion },
              after: { ...after, version: saved.version },
              meta,
            },
            { dbSession },
          )
          return { fund: toFundView(saved, authors), changed: true }
        })
      } catch (error) {
        if (isDuplicateKey(error)) throw versionConflict() // première écriture simultanée : l'autre associé a créé le document
        throw error
      }
    },

    async getPreferences({ userId }) {
      return toPreferencesView(await UserPreferences.findOne({ user: userId }).lean())
    },

    /** Modification partielle de SES préférences ; le propriétaire est l'utilisateur de la session. */
    async updatePreferences({ userId, changes }) {
      return toPreferencesView(await upsertPreferences(userId, changes))
    },

    async resetPreferences({ userId }) {
      const existing = await UserPreferences.exists({ user: userId })
      if (!existing) return toPreferencesView(null) // rien à réécrire
      return toPreferencesView(await upsertPreferences(userId, { ...DEFAULT_USER_PREFERENCES }))
    },

    async getContributionReminders({ userId }) {
      const now = clock()
      const preferences = await UserPreferences.findOne({ user: userId }, { contributionRemindersEnabled: 1 }).lean()
      const enabled = preferences?.contributionRemindersEnabled ?? DEFAULT_USER_PREFERENCES.contributionRemindersEnabled
      const common = { asOf: todayInBusinessZone(now), generatedAt: now.toISOString(), currency: CURRENCY_CODE, timeZone: BUSINESS_TIME_ZONE }
      if (!enabled) return { enabled: false, available: false, unavailableReason: null, pendingCount: 0, months: [], ...common }

      const [users, contributions] = await Promise.all([
        User.find({}, { name: 1, partnerNumber: 1 }).sort({ partnerNumber: 1 }).lean(),
        Contribution.find({ deletedAt: null }, { partner: 1, amount: 1, period: 1, contributionDate: 1 }).lean(),
      ])
      const summary = computeContributionSummary({
        today: common.asOf,
        fundStartPeriod: config.fund.startPeriod,
        monthlyTarget: MONTHLY_CONTRIBUTION_PER_PARTNER,
        partners: users.map((user) => ({ id: String(user._id), name: user.name, partnerNumber: user.partnerNumber })),
        contributions,
      })
      return { enabled: true, ...buildContributionReminders(summary), ...common }
    },

    /** Informations de sécurité du compte connecté et de SES sessions actives. Jamais de mot de passe, d'empreinte, de jeton ni de secret. */
    async getSecurity({ userId, sessionId }) {
      const now = new Date() // les sessions expirent à l'heure réelle du serveur (comme `authenticate`), pas selon l'horloge métier injectée
      const [user, sessions, activeCount] = await Promise.all([
        User.findById(userId, { name: 1, email: 1, partnerNumber: 1, status: 1, mustChangePassword: 1, passwordChangedAt: 1, lastLoginAt: 1 }).lean(),
        Session.find({ user: userId, revokedAt: null, expiresAt: { $gt: now } }, { createdAt: 1, lastUsedAt: 1, expiresAt: 1, userAgent: 1, ipAddress: 1 })
          .sort({ lastUsedAt: -1, createdAt: -1 })
          .limit(MAX_LISTED_SESSIONS)
          .lean(),
        Session.countDocuments({ user: userId, revokedAt: null, expiresAt: { $gt: now } }),
      ])
      if (!user) throw new AppError({ status: 401, code: 'SESSION_REVOKED', message: 'Session terminée. Veuillez vous reconnecter.' })
      return {
        account: {
          name: user.name,
          email: user.email,
          partnerNumber: user.partnerNumber,
          status: user.status,
          passwordProtected: true, // le compte s'authentifie par mot de passe (stocké uniquement sous forme d'empreinte, jamais exposée)
          passwordChangedAt: user.passwordChangedAt ?? null,
          mustChangePassword: Boolean(user.mustChangePassword),
          lastLoginAt: user.lastLoginAt ?? null,
        },
        authentication: {
          method: 'EMAIL_PASSWORD',
          cookies: 'HTTP_ONLY',
          accessTokenMinutes: Math.round(config.auth.accessTokenTtlSeconds / 60),
          refreshTokenDays: Math.round(config.auth.refreshTokenTtlSeconds / 86400),
          passwordChangeApiAvailable: true,
        },
        sessions: {
          activeCount,
          items: sessions.map((session) => ({
            current: String(session._id) === String(sessionId),
            createdAt: session.createdAt ?? null,
            lastUsedAt: session.lastUsedAt ?? null,
            expiresAt: session.expiresAt,
            userAgent: session.userAgent ?? null,
            ipAddress: session.ipAddress ?? null,
          })),
        },
        generatedAt: now.toISOString(),
      }
    },
  }
}
