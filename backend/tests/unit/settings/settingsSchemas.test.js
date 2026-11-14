import { describe, expect, it } from 'vitest'
import { emptyBodySchema, normalizeText, updatePreferencesSchema, updateSettingsSchema } from '../../../src/validation/settings.schemas.js'

const parse = (schema, body) => schema.safeParse(body)
const fieldsOf = (result) => result.error.issues.map((issue) => issue.path.join('.'))
const LONG_DESCRIPTION = 'a'.repeat(300)

describe('normalizeText', () => {
  it('retire les espaces de bord, réduit les espaces multiples et garde les retours à la ligne', () => {
    expect(normalizeText('  Bonjour    le   monde \n  ligne  deux  ')).toBe('Bonjour le monde\nligne deux')
  })
})

describe('PUT /settings : paramètres communs', () => {
  it('accepte des données valides et nettoie les textes', () => {
    const result = parse(updateSettingsSchema, { expectedVersion: 0, description: '  Fonds   commun des deux associés  ', projectInfo: '  Objectif   clair ' })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ expectedVersion: 0, description: 'Fonds commun des deux associés', projectInfo: 'Objectif clair' })
  })

  it('accepte de ne modifier qu’un seul champ', () => {
    expect(parse(updateSettingsSchema, { expectedVersion: 3, description: 'Une description valide' }).success).toBe(true)
    expect(parse(updateSettingsSchema, { expectedVersion: 3, projectInfo: '' }).success).toBe(true) // informations du projet facultatives
  })

  it('exige la version attendue (entier ≥ 0)', () => {
    expect(parse(updateSettingsSchema, { description: 'Une description valide' }).success).toBe(false)
    for (const expectedVersion of [-1, 1.5, '2', null, Number.NaN]) {
      expect(parse(updateSettingsSchema, { expectedVersion, description: 'Une description valide' }).success).toBe(false)
    }
  })

  it('refuse un corps sans aucune modification', () => {
    expect(parse(updateSettingsSchema, { expectedVersion: 1 }).success).toBe(false)
  })

  it('applique les limites de longueur du formulaire (10 à 300 ; 500 maximum)', () => {
    expect(fieldsOf(parse(updateSettingsSchema, { expectedVersion: 0, description: 'court' }))).toContain('description')
    expect(fieldsOf(parse(updateSettingsSchema, { expectedVersion: 0, description: '         ' }))).toContain('description')
    expect(parse(updateSettingsSchema, { expectedVersion: 0, description: LONG_DESCRIPTION }).success).toBe(true)
    expect(parse(updateSettingsSchema, { expectedVersion: 0, description: `${LONG_DESCRIPTION}a` }).success).toBe(false)
    expect(parse(updateSettingsSchema, { expectedVersion: 0, projectInfo: 'b'.repeat(500) }).success).toBe(true)
    expect(fieldsOf(parse(updateSettingsSchema, { expectedVersion: 0, projectInfo: 'b'.repeat(501) }))).toContain('projectInfo')
  })

  it('refuse les champs non modifiables et tout champ inconnu (identité, devise, objectifs, associés, identifiants)', () => {
    for (const extra of [{ name: 'AUTRE' }, { slogan: 'x' }, { currency: 'EUR' }, { currencyCode: 'EUR' }, { monthlyTarget: 20000 }, { fundStartPeriod: '2020-01' }, { partners: [] }, { updatedBy: 'x' }, { version: 9 }, { userId: 'x' }]) {
      expect(parse(updateSettingsSchema, { expectedVersion: 0, description: 'Une description valide', ...extra }).success).toBe(false)
    }
  })

  it('refuse des types incorrects', () => {
    expect(parse(updateSettingsSchema, { expectedVersion: 0, description: 12345678901 }).success).toBe(false)
    expect(parse(updateSettingsSchema, { expectedVersion: 0, projectInfo: ['x'] }).success).toBe(false)
  })
})

describe('PUT /settings/preferences : préférences personnelles', () => {
  it('accepte une modification partielle valide', () => {
    expect(parse(updatePreferencesSchema, { theme: 'dark' }).success).toBe(true)
    expect(parse(updatePreferencesSchema, { amountSeparator: 'dot', visualNotificationsEnabled: false }).success).toBe(true)
    expect(parse(updatePreferencesSchema, { theme: 'light', amountSeparator: 'none', visualNotificationsEnabled: true, contributionRemindersEnabled: false }).success).toBe(true)
  })

  it('accepte exactement les trois formats de montant existants', () => {
    for (const amountSeparator of ['space', 'dot', 'none']) expect(parse(updatePreferencesSchema, { amountSeparator }).success).toBe(true)
    for (const amountSeparator of ['comma', 'apostrophe', '', ' ', 'SPACE', null]) expect(parse(updatePreferencesSchema, { amountSeparator }).success).toBe(false)
  })

  it('refuse un thème inconnu', () => {
    for (const theme of ['blue', 'DARK', '', null, 1, true]) expect(parse(updatePreferencesSchema, { theme }).success).toBe(false)
  })

  it('refuse les booléens sous forme de texte ou de nombre', () => {
    for (const value of ['true', 'false', 1, 0, null]) {
      expect(parse(updatePreferencesSchema, { visualNotificationsEnabled: value }).success).toBe(false)
      expect(parse(updatePreferencesSchema, { contributionRemindersEnabled: value }).success).toBe(false)
    }
  })

  it('refuse un corps vide', () => {
    expect(parse(updatePreferencesSchema, {}).success).toBe(false)
  })

  it('n’accepte JAMAIS d’identifiant d’utilisateur ni de préférence d’email', () => {
    for (const extra of [{ userId: '507f1f77bcf86cd799439011' }, { user: '507f1f77bcf86cd799439011' }, { _id: 'x' }, { id: 'x' }, { emailNotificationsEnabled: true }, { emailNotifications: true }, { partnerNumber: 2 }]) {
      expect(parse(updatePreferencesSchema, { theme: 'dark', ...extra }).success).toBe(false)
    }
  })
})

describe('POST /settings/preferences/reset', () => {
  it('n’attend aucun champ', () => {
    expect(parse(emptyBodySchema, {}).success).toBe(true)
    expect(parse(emptyBodySchema, { userId: 'x' }).success).toBe(false)
    expect(parse(emptyBodySchema, { theme: 'dark' }).success).toBe(false)
  })
})
