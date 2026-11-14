import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PREFERENCES,
  buildReminderView,
  buildSettingsUpdate,
  getSettingsErrorMessage,
  normalizePreferences,
  shouldShowReminderBadge,
  summarizeUserAgent,
  toSecurityView,
  toSettingsView,
  validateGeneralValues,
} from '../src/utils/settingsViewModel'

const apiSettings = {
  identity: { name: 'DUO CAPITAL', slogan: 'Ensemble, plus loin !', currencyLabel: 'FCFA (XOF)' },
  fund: { description: 'Description du fonds.', projectInfo: 'Infos', version: 4, updatedAt: '2026-12-02T10:00:00.000Z', updatedBy: { name: 'Cheikh Sow' } },
  partners: [{ id: 'a', name: 'Mohamed Bakhoum', partnerNumber: 1 }, { id: 'b', name: 'Cheikh Sow', partnerNumber: 2 }],
  objectives: { monthlyPerPartner: 15000, monthlyCollective: 30000 },
  limits: { descriptionMin: 10, descriptionMax: 300, projectInfoMax: 500 },
}

describe('préférences personnelles', () => {
  it('valeurs par défaut pour une réponse vide ou invalide', () => {
    expect(normalizePreferences(null)).toEqual(DEFAULT_PREFERENCES)
    expect(normalizePreferences({ theme: 'pink', amountSeparator: 'x', visualNotificationsEnabled: 'oui' })).toEqual(DEFAULT_PREFERENCES)
  })
  it('conserve des valeurs valides, ignore les champs inconnus', () => {
    const result = normalizePreferences({ theme: 'dark', amountSeparator: 'dot', visualNotificationsEnabled: false, contributionRemindersEnabled: false, isDefault: false, role: 'root' })
    expect(result).toEqual({ theme: 'dark', amountSeparator: 'dot', visualNotificationsEnabled: false, contributionRemindersEnabled: false })
  })
  it('deux associés : objets indépendants (Mohamed sombre, Cheikh clair)', () => {
    const mohamed = normalizePreferences({ theme: 'dark' })
    const cheikh = normalizePreferences({ theme: 'light' })
    expect([mohamed.theme, cheikh.theme]).toEqual(['dark', 'light'])
    expect(mohamed).not.toBe(cheikh)
  })
})

describe('paramètres communs', () => {
  it('adapte la réponse du serveur', () => {
    const view = toSettingsView(apiSettings)
    expect(view.version).toBe(4)
    expect(view.values).toEqual({ description: 'Description du fonds.', projectInfo: 'Infos' })
    expect(view.updatedByName).toBe('Cheikh Sow')
    expect(view.partners).toHaveLength(2)
  })
  it('valide avec les limites du serveur', () => {
    const limits = { descriptionMin: 10, descriptionMax: 20, projectInfoMax: 5 }
    expect(validateGeneralValues({ description: 'court', projectInfo: '' }, limits).errors.description).toMatch(/au moins 10/)
    expect(validateGeneralValues({ description: 'x'.repeat(21), projectInfo: '' }, limits).errors.description).toMatch(/dépasser 20/)
    expect(validateGeneralValues({ description: 'Description ok', projectInfo: 'trop long' }, limits).errors.projectInfo).toMatch(/dépasser 5/)
    expect(validateGeneralValues({ description: '  Description   ok ', projectInfo: ' a ' }, limits).values).toEqual({ description: 'Description ok', projectInfo: 'a' })
  })
  it("n'envoie que les champs modifiés, avec la version connue ; rien si rien n'a changé", () => {
    const saved = { description: 'A description', projectInfo: 'B' }
    expect(buildSettingsUpdate({ expectedVersion: 4, values: { ...saved, projectInfo: 'C' }, saved })).toEqual({ expectedVersion: 4, projectInfo: 'C' })
    expect(buildSettingsUpdate({ expectedVersion: 4, values: saved, saved })).toBeNull()
  })
  it('conflit 409 : message compréhensible ; autres erreurs : message générique', () => {
    expect(getSettingsErrorMessage({ status: 409, code: 'SETTINGS_VERSION_CONFLICT' })).toMatch(/modifiées entre-temps par l'autre associé/)
    expect(getSettingsErrorMessage({ status: 0, code: 'NETWORK_ERROR' })).toMatch(/Impossible de joindre le serveur/)
  })
})

const partner = (name, number, paid, status) => ({ partnerId: name, name, partnerNumber: number, monthlyTarget: 15000, paid, remaining: Math.max(0, 15000 - paid), progressPercent: Math.round((paid / 15000) * 100), status })

describe('rappels de cotisation', () => {
  const data = {
    enabled: true,
    available: true,
    months: [
      { period: '2026-12', isCurrent: true, isOverdue: false, partners: [partner('Mohamed Bakhoum', 1, 15000, 'ACHIEVED'), partner('Cheikh Sow', 2, 5000, 'TO_COMPLETE')] },
      { period: '2026-11', isCurrent: false, isOverdue: true, partners: [partner('Mohamed Bakhoum', 1, 0, 'TO_COMPLETE'), partner('Cheikh Sow', 2, 15000, 'ACHIEVED')] },
    ],
  }
  it('une ligne par associé dont la cotisation reste à compléter, mois en cours en premier', () => {
    const view = buildReminderView(data)
    expect(view.items.map((item) => [item.partnerName, item.period, item.remaining])).toEqual([
      ['Cheikh Sow', '2026-12', 10000],
      ['Mohamed Bakhoum', '2026-11', 15000],
    ])
    expect(view.items[0].isCurrent).toBe(true)
    expect(view.items[1].isOverdue).toBe(true)
    expect(view.itemCount).toBe(2)
    expect(view.monthCount).toBe(2)
  })
  it('tout à jour : aucun rappel inventé', () => {
    const view = buildReminderView({ enabled: true, available: true, months: [{ period: '2026-12', isCurrent: true, partners: [partner('A', 1, 15000, 'ACHIEVED')] }] })
    expect(view.items).toEqual([])
  })
  it('rappels désactivés ou absents : aucun élément', () => {
    expect(buildReminderView({ enabled: false, months: data.months }).items).toEqual([])
    expect(buildReminderView(null).items).toEqual([])
  })
  it('indisponible : raison transmise, aucun élément', () => {
    const view = buildReminderView({ enabled: true, available: false, unavailableReason: 'Le fonds démarre en décembre 2026.' })
    expect(view.available).toBe(false)
    expect(view.unavailableReason).toMatch(/décembre 2026/)
    expect(view.itemCount).toBe(0)
  })
  it('pastille / bannière : notifications visuelles ET rappels activés, et au moins un rappel', () => {
    const view = buildReminderView(data)
    const on = { visualNotificationsEnabled: true, contributionRemindersEnabled: true }
    expect(shouldShowReminderBadge(on, view)).toBe(true)
    expect(shouldShowReminderBadge({ ...on, visualNotificationsEnabled: false }, view)).toBe(false)
    expect(shouldShowReminderBadge({ ...on, contributionRemindersEnabled: false }, view)).toBe(false)
    expect(shouldShowReminderBadge(on, buildReminderView(null))).toBe(false)
  })
})

describe('sécurité', () => {
  const data = {
    account: { name: 'Mohamed Bakhoum', email: 'm@example.com', partnerNumber: 1, status: 'ACTIVE', passwordProtected: true, passwordChangedAt: null, mustChangePassword: false, lastLoginAt: '2026-12-02T09:00:00.000Z' },
    authentication: { accessTokenMinutes: 15, refreshTokenDays: 7 },
    sessions: { activeCount: 1, items: [{ current: true, createdAt: '2026-12-02T09:00:00.000Z', lastUsedAt: '2026-12-02T09:30:00.000Z', expiresAt: '2026-12-09T09:00:00.000Z', userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537', ipAddress: '1.2.3.4' }] },
  }
  it('adapte les données du compte et des sessions', () => {
    const view = toSecurityView(data)
    expect(view.account.isActive).toBe(true)
    expect(view.activeCount).toBe(1)
    expect(view.sessions[0].isCurrent).toBe(true)
    expect(view.sessions[0].device).toBe('Chrome sur Windows')
  })
  it("n'expose ni adresse IP, ni jeton, ni mot de passe", () => {
    const text = JSON.stringify(toSecurityView({ ...data, account: { ...data.account, passwordHash: 'secret', token: 'abc' } }))
    expect(/1\.2\.3\.4|secret|"abc"|passwordHash/i.test(text)).toBe(false)
  })
  it('agent utilisateur inconnu', () => {
    expect(summarizeUserAgent('')).toBe('Appareil inconnu')
  })
})
