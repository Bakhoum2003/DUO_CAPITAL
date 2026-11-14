import { describe, expect, it } from 'vitest'
import { FundSettings } from '../../../src/models/FundSettings.js'
import { UserPreferences } from '../../../src/models/UserPreferences.js'
import { AMOUNT_SEPARATORS, AUDIT_RESOURCE_TYPES, DEFAULT_FUND_SETTINGS, DEFAULT_USER_PREFERENCES, FUND_SETTINGS_ID, THEMES } from '../../../src/models/shared/constants.js'
import { indexByName, invalidPaths, oid } from '../../helpers/modelFixtures.js'

const validFund = (overrides = {}) => ({ description: 'Fonds commun des deux associés', projectInfo: 'Objectif clair', updatedBy: oid(), ...overrides })

describe('modèle FundSettings (paramètres communs)', () => {
  it('accepte un document valide avec l’identifiant fixe et la version 1', async () => {
    const doc = new FundSettings(validFund())
    expect(await invalidPaths(doc)).toEqual([])
    expect(String(doc._id)).toBe(FUND_SETTINGS_ID)
    expect(doc.version).toBe(1)
  })

  it('exige une description de 10 à 300 caractères et un auteur', async () => {
    expect(await invalidPaths(new FundSettings(validFund({ description: 'court' })))).toContain('description')
    expect(await invalidPaths(new FundSettings(validFund({ description: 'a'.repeat(301) })))).toContain('description')
    expect(await invalidPaths(new FundSettings(validFund({ description: undefined })))).toContain('description')
    expect(await invalidPaths(new FundSettings(validFund({ updatedBy: undefined })))).toContain('updatedBy')
  })

  it('limite les informations du projet à 500 caractères', async () => {
    expect(await invalidPaths(new FundSettings(validFund({ projectInfo: 'b'.repeat(501) })))).toContain('projectInfo')
    expect(await invalidPaths(new FundSettings(validFund({ projectInfo: '' })))).toEqual([])
  })

  it('exige une version entière ≥ 1', async () => {
    expect(await invalidPaths(new FundSettings(validFund({ version: 0 })))).toContain('version')
    expect(await invalidPaths(new FundSettings(validFund({ version: 1.5 })))).toContain('version')
  })

  it('ne contient ni nom, ni slogan, ni devise (identité non modifiable) et refuse tout champ inconnu', () => {
    for (const path of ['name', 'slogan', 'currency', 'monthlyTarget', 'partners']) expect(FundSettings.schema.path(path)).toBeUndefined()
    expect(FundSettings.schema.options.strict).toBe('throw')
    expect(() => new FundSettings({ ...validFund(), name: 'AUTRE' })).toThrow()
  })

  it('interdit la suppression physique', async () => {
    await expect(FundSettings.deleteOne({}).exec()).rejects.toMatchObject({ code: 'SETTINGS_DELETE_FORBIDDEN', status: 409 })
  })

  it('les valeurs par défaut correspondent exactement aux textes actuels de l’application', () => {
    expect(DEFAULT_FUND_SETTINGS.description).toBe("Fonds d'investissement commun de deux associés, Mohamed Bakhoum et Cheikh Sow : cotisations mensuelles, activités commerciales et suivi des résultats.")
    expect(DEFAULT_FUND_SETTINGS.projectInfo).toBe('Objectif : faire fructifier le capital en finançant ensemble de petites activités commerciales.')
  })
})

describe('modèle UserPreferences (préférences personnelles)', () => {
  it('applique les valeurs par défaut recommandées', async () => {
    const doc = new UserPreferences({ user: oid() })
    expect(await invalidPaths(doc)).toEqual([])
    expect(doc.theme).toBe('light')
    expect(doc.amountSeparator).toBe('space')
    expect(doc.visualNotificationsEnabled).toBe(true)
    expect(doc.contributionRemindersEnabled).toBe(true)
    expect(DEFAULT_USER_PREFERENCES).toEqual({ theme: 'light', amountSeparator: 'space', visualNotificationsEnabled: true, contributionRemindersEnabled: true })
  })

  it('exige un propriétaire', async () => {
    expect(await invalidPaths(new UserPreferences({}))).toContain('user')
  })

  it('valide le thème et le format des montants', async () => {
    expect(THEMES).toEqual(['light', 'dark'])
    expect(AMOUNT_SEPARATORS).toEqual(['space', 'dot', 'none'])
    for (const theme of THEMES) expect(await invalidPaths(new UserPreferences({ user: oid(), theme }))).toEqual([])
    for (const amountSeparator of AMOUNT_SEPARATORS) expect(await invalidPaths(new UserPreferences({ user: oid(), amountSeparator }))).toEqual([])
    expect(await invalidPaths(new UserPreferences({ user: oid(), theme: 'blue' }))).toContain('theme')
    expect(await invalidPaths(new UserPreferences({ user: oid(), amountSeparator: 'comma' }))).toContain('amountSeparator')
  })

  it('un seul document de préférences par utilisateur (index unique)', () => {
    expect(indexByName(UserPreferences, 'uniq_user_preferences_user')).toMatchObject({ fields: { user: 1 }, options: { unique: true } })
  })

  it('aucun champ d’email, aucun secret, strict', () => {
    for (const path of ['emailNotificationsEnabled', 'emailNotifications', 'email', 'password', 'token']) expect(UserPreferences.schema.path(path)).toBeUndefined()
    expect(UserPreferences.schema.options.strict).toBe('throw')
  })

  it('interdit la suppression physique', async () => {
    await expect(UserPreferences.deleteMany({}).exec()).rejects.toMatchObject({ code: 'PREFERENCES_DELETE_FORBIDDEN', status: 409 })
  })
})

describe('journal d’audit', () => {
  it('SETTINGS est ajouté sans retirer aucun type existant', () => {
    expect(AUDIT_RESOURCE_TYPES).toEqual(['USER', 'SESSION', 'CONTRIBUTION', 'BUSINESS', 'BUSINESS_OPERATION', 'WITHDRAWAL', 'SETTINGS'])
  })
})
