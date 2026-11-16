import { DEFAULT_AMOUNT_FORMAT, DEFAULT_THEME, THEMES } from '../services/settingsService'
import { AMOUNT_FORMATS } from '../constants/settingsSettings'
import { getErrorMessage } from './apiErrors'
import { formatMonthLabel } from './formatters'


export const SETTINGS_CONFLICT_CODE = 'SETTINGS_VERSION_CONFLICT'

export const DEFAULT_PREFERENCES = {
  theme: DEFAULT_THEME,
  amountSeparator: DEFAULT_AMOUNT_FORMAT,
  visualNotificationsEnabled: true,
  contributionRemindersEnabled: true,
}

export const THEME_OPTIONS = [
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
]

const FALLBACK_LIMITS = { descriptionMin: 10, descriptionMax: 300, projectInfoMax: 500 }

export function normalizePreferences(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    theme: THEMES.includes(source.theme) ? source.theme : DEFAULT_PREFERENCES.theme,
    amountSeparator: Object.hasOwn(AMOUNT_FORMATS, source.amountSeparator) ? source.amountSeparator : DEFAULT_PREFERENCES.amountSeparator,
    visualNotificationsEnabled:
      typeof source.visualNotificationsEnabled === 'boolean' ? source.visualNotificationsEnabled : DEFAULT_PREFERENCES.visualNotificationsEnabled,
    contributionRemindersEnabled:
      typeof source.contributionRemindersEnabled === 'boolean'
        ? source.contributionRemindersEnabled
        : DEFAULT_PREFERENCES.contributionRemindersEnabled,
  }
}

const normalizeText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

export function toSettingsView(data) {
  const fund = data?.fund ?? {}
  return {
    identity: data?.identity ?? null,
    values: { description: fund.description ?? '', projectInfo: fund.projectInfo ?? '' },
    version: Number.isInteger(fund.version) ? fund.version : 0,
    updatedAt: fund.updatedAt ?? null,
    updatedByName: fund.updatedBy?.name ?? null,
    partners: Array.isArray(data?.partners) ? data.partners : [],
    objectives: data?.objectives ?? null,
    limits: { ...FALLBACK_LIMITS, ...(data?.limits ?? {}) },
  }
}

export function validateGeneralValues(input, limits = FALLBACK_LIMITS) {
  const errors = {}
  const description = normalizeText(input?.description)
  const projectInfo = String(input?.projectInfo ?? '').trim()

  if (description.length < limits.descriptionMin) {
    errors.description = `La description doit contenir au moins ${limits.descriptionMin} caractères.`
  } else if (description.length > limits.descriptionMax) {
    errors.description = `La description ne peut pas dépasser ${limits.descriptionMax} caractères.`
  }
  if (projectInfo.length > limits.projectInfoMax) {
    errors.projectInfo = `Les informations du projet ne peuvent pas dépasser ${limits.projectInfoMax} caractères.`
  }
  return { isValid: Object.keys(errors).length === 0, errors, values: { description, projectInfo } }
}

export function buildSettingsUpdate({ expectedVersion, values, saved }) {
  const body = { expectedVersion }
  if (values.description !== saved.description) body.description = values.description
  if (values.projectInfo !== saved.projectInfo) body.projectInfo = values.projectInfo
  return Object.keys(body).length > 1 ? body : null
}

export function getSettingsErrorMessage(error) {
  if (error?.status === 409 || error?.code === SETTINGS_CONFLICT_CODE) {
    return "Ces informations ont été modifiées entre-temps par l'autre associé. Les valeurs à jour viennent d'être rechargées : vérifiez-les puis refaites votre modification."
  }
  return getErrorMessage(error)
}


export function buildReminderView(data) {
  const base = { enabled: false, available: false, unavailableReason: '', items: [], itemCount: 0, monthCount: 0 }
  if (!data || data.enabled === false) return base
  if (data.available === false) return { ...base, enabled: true, unavailableReason: data.unavailableReason ?? '' }

  const items = []
  const months = Array.isArray(data.months) ? data.months : []
  for (const month of months) {
    for (const partner of month.partners ?? []) {
      if (!(partner.remaining > 0)) continue
      items.push({
        key: `${month.period}-${partner.partnerId ?? partner.partnerNumber}`,
        period: month.period,
        monthLabel: formatMonthLabel(month.period),
        isCurrent: Boolean(month.isCurrent),
        isOverdue: Boolean(month.isOverdue),
        partnerName: partner.name,
        partnerNumber: partner.partnerNumber,
        target: partner.monthlyTarget,
        paid: partner.paid,
        remaining: partner.remaining,
        progressPercent: Math.max(0, Math.min(100, Number(partner.progressPercent) || 0)),
      })
    }
  }
  const monthCount = new Set(items.map((item) => item.period)).size
  return { enabled: true, available: true, unavailableReason: '', items, itemCount: items.length, monthCount }
}

export function shouldShowReminderBadge(preferences, reminderView) {
  return Boolean(preferences?.visualNotificationsEnabled && preferences?.contributionRemindersEnabled && reminderView?.itemCount > 0)
}

/* ---------- Sécurité ---------- */

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Dakar' })

export function formatDateTime(iso) {
  const date = iso ? new Date(iso) : null
  return date && !Number.isNaN(date.getTime()) ? dateTimeFormatter.format(date) : '—'
}

/** Vue de la section Sécurité. Aucun secret : l'API n'en envoie pas et rien d'autre n'est affiché. */
export function toSecurityView(data) {
  const account = data?.account ?? {}
  const authentication = data?.authentication ?? {}
  const sessions = data?.sessions ?? {}
  return {
    account: {
      name: account.name ?? '',
      email: account.email ?? '',
      partnerNumber: account.partnerNumber ?? null,
      isActive: account.status === 'ACTIVE',
      passwordProtected: account.passwordProtected !== false,
      passwordChangedAt: account.passwordChangedAt ? formatDateTime(account.passwordChangedAt) : null,
      mustChangePassword: Boolean(account.mustChangePassword),
      lastLoginAt: account.lastLoginAt ? formatDateTime(account.lastLoginAt) : null,
    },
    accessTokenMinutes: authentication.accessTokenMinutes ?? null,
    refreshTokenDays: authentication.refreshTokenDays ?? null,
    activeCount: Number.isInteger(sessions.activeCount) ? sessions.activeCount : 0,
    sessions: (sessions.items ?? []).map((session, index) => ({
      key: `${session.createdAt ?? index}-${index}`,
      isCurrent: Boolean(session.current),
      device: summarizeUserAgent(session.userAgent),
      createdAt: formatDateTime(session.createdAt),
      lastUsedAt: formatDateTime(session.lastUsedAt),
      expiresAt: formatDateTime(session.expiresAt),
    })),
  }
}

export function summarizeUserAgent(userAgent) {
  const text = String(userAgent ?? '')
  if (!text) return 'Appareil inconnu'
  const browser = /Edg\//.test(text) ? 'Edge' : /OPR\//.test(text) ? 'Opera' : /Firefox\//.test(text) ? 'Firefox' : /Chrome\//.test(text) ? 'Chrome' : /Safari\//.test(text) ? 'Safari' : 'Navigateur'
  const system = /Windows/.test(text) ? 'Windows' : /Android/.test(text) ? 'Android' : /iPhone|iPad/.test(text) ? 'iOS' : /Mac OS/.test(text) ? 'macOS' : /Linux/.test(text) ? 'Linux' : 'système inconnu'
  return `${browser} sur ${system}`
}
