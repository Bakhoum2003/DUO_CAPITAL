import { afterEach, describe, expect, it } from 'vitest'
import { COLLECTIVE_MONTHLY_TARGET, CONTRIBUTION_ASSOCIATES, MONTHLY_TARGET_PER_ASSOCIATE } from '../src/constants/contributionSettings'
import { DEFAULT_SETTINGS } from '../src/constants/settingsSettings'
import { formatCurrency, formatNumber, setAmountSeparator } from '../src/utils/formatters'
import {
  areValuesEqual,
  getParticipationPercent,
  normalizeText,
  sanitizeSettings,
  validateAssociateName,
  validateAssociates,
  validateGeneralInfo,
  validateObjectives,
  validatePreferences,
} from '../src/utils/settingsValidators'

describe('valeurs par défaut', () => {
  it('les valeurs par défaut sont elles-mêmes valides', () => {
    expect(validateGeneralInfo(DEFAULT_SETTINGS.general).isValid).toBe(true)
    expect(validatePreferences(DEFAULT_SETTINGS.preferences).isValid).toBe(true)
  })

  it('préférences par défaut : espace insécable et notifications visibles', () => {
    expect(DEFAULT_SETTINGS.preferences.amountFormat).toBe('space')
    expect(DEFAULT_SETTINGS.preferences.visualNotifications).toBe(true)
  })
})

describe('informations générales', () => {
  const valid = { description: 'Fonds commun de deux associés.', projectInfo: 'Un projet.' }

  it('accepte des informations correctes', () => {
    const result = validateGeneralInfo(valid)
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('nettoie les espaces inutiles', () => {
    const result = validateGeneralInfo({ description: '   Fonds    commun   des associés  ', projectInfo: '  ok  ' })
    expect(result.values.description).toBe('Fonds commun des associés')
    expect(result.values.projectInfo).toBe('ok')
  })

  it('refuse une description vide ou faite d\'espaces', () => {
    expect(validateGeneralInfo({ ...valid, description: '' }).errors.description).toBe('La description du fonds est obligatoire.')
    expect(validateGeneralInfo({ ...valid, description: '      ' }).isValid).toBe(false)
  })

  it('refuse une description trop courte ou trop longue', () => {
    expect(validateGeneralInfo({ ...valid, description: 'Court' }).errors.description).toContain('au moins 10')
    expect(validateGeneralInfo({ ...valid, description: 'a'.repeat(301) }).errors.description).toContain('300')
    expect(validateGeneralInfo({ ...valid, description: 'a'.repeat(300) }).isValid).toBe(true)
  })

  it('les informations du projet sont facultatives mais limitées à 500 caractères', () => {
    expect(validateGeneralInfo({ ...valid, projectInfo: '' }).isValid).toBe(true)
    expect(validateGeneralInfo({ ...valid, projectInfo: 'a'.repeat(501) }).errors.projectInfo).toContain('500')
  })

  it('données invalides (null, nombres, objets) : erreur, pas de plantage', () => {
    expect(validateGeneralInfo(null).isValid).toBe(false)
    expect(validateGeneralInfo({ description: 42, projectInfo: {} }).isValid).toBe(false)
    expect(normalizeText(undefined)).toBe('')
  })
})

describe('noms des associés', () => {
  it('accepte les deux associés actuels', () => {
    CONTRIBUTION_ASSOCIATES.forEach((associate) => expect(validateAssociateName(associate.name)).toBe(''))
    expect(validateAssociates(CONTRIBUTION_ASSOCIATES)).toEqual([])
  })

  it('accepte accents, tirets et apostrophes', () => {
    expect(validateAssociateName("Jean-Luc N'Diaye")).toBe('')
    expect(validateAssociateName('Aïssatou Sow')).toBe('')
  })

  it('refuse un nom vide, trop court, trop long ou avec chiffres / symboles', () => {
    expect(validateAssociateName('')).not.toBe('')
    expect(validateAssociateName('A')).toContain('au moins 2')
    expect(validateAssociateName('a'.repeat(61))).toContain('60')
    expect(validateAssociateName('Mohamed123')).toContain('lettres')
    expect(validateAssociateName('<script>')).toContain('lettres')
    expect(validateAssociateName(null)).not.toBe('')
  })

  it('refuse un troisième associé ou un seul associé', () => {
    const third = { id: 'troisieme', name: 'Awa Diop' }
    expect(validateAssociates([...CONTRIBUTION_ASSOCIATES, third])[0]).toContain('exactement 2')
    expect(validateAssociates(CONTRIBUTION_ASSOCIATES.slice(0, 1))[0]).toContain('exactement 2')
  })

  it('refuse deux associés de même nom ou de même identifiant', () => {
    const sameName = [{ id: 'a', name: 'Cheikh Sow' }, { id: 'b', name: 'cheikh sow' }]
    expect(validateAssociates(sameName)).toContain('Deux associés ne peuvent pas porter le même nom.')
    const sameId = [{ id: 'a', name: 'Cheikh Sow' }, { id: 'a', name: 'Mohamed Bakhoum' }]
    expect(validateAssociates(sameId)).toContain('Deux associés ne peuvent pas avoir le même identifiant.')
  })

  it('liste invalide', () => {
    expect(validateAssociates(null)).toEqual(['La liste des associés est invalide.'])
  })

  it('participation au fonds : 50 % chacun pour deux associés, jamais de division par zéro', () => {
    expect(getParticipationPercent(2)).toBe(50)
    expect(getParticipationPercent(0)).toBe(0)
  })
})

describe('objectifs de cotisation', () => {
  it('les objectifs de l\'application sont cohérents : 15 000 individuel, 30 000 collectif', () => {
    expect(MONTHLY_TARGET_PER_ASSOCIATE).toBe(15000)
    expect(COLLECTIVE_MONTHLY_TARGET).toBe(30000)
    const result = validateObjectives({
      individual: MONTHLY_TARGET_PER_ASSOCIATE,
      collective: COLLECTIVE_MONTHLY_TARGET,
      associateCount: CONTRIBUTION_ASSOCIATES.length,
    })
    expect(result).toEqual({ isValid: true, errors: [] })
  })

  it('refuse zéro, un négatif, un décimal, un texte ou un montant démesuré', () => {
    ;[0, -15000, 1500.5, '15000', NaN, 20000000].forEach((individual) => {
      expect(validateObjectives({ individual, collective: 30000, associateCount: 2 }).isValid).toBe(false)
    })
  })

  it('refuse un objectif collectif incohérent', () => {
    const result = validateObjectives({ individual: 15000, collective: 25000, associateCount: 2 })
    expect(result.isValid).toBe(false)
    expect(result.errors[0]).toContain('collectif')
  })
})

describe('préférences', () => {
  it('accepte les formats connus et un booléen', () => {
    ;['space', 'dot', 'none'].forEach((amountFormat) => {
      expect(validatePreferences({ amountFormat, visualNotifications: false }).isValid).toBe(true)
    })
  })

  it('refuse un format inconnu, une valeur non booléenne, ou des données absentes', () => {
    expect(validatePreferences({ amountFormat: 'euro', visualNotifications: true }).errors.amountFormat).toBeTruthy()
    expect(validatePreferences({ amountFormat: 'space', visualNotifications: 'oui' }).errors.visualNotifications).toBeTruthy()
    expect(validatePreferences(undefined).isValid).toBe(false)
    expect(validatePreferences({ amountFormat: 'toString', visualNotifications: true }).isValid).toBe(false)
  })
})

describe('données enregistrées invalides', () => {
  it('valeurs correctes : conservées telles quelles', () => {
    const saved = { general: { description: 'Une description valable.', projectInfo: '' }, preferences: { amountFormat: 'dot', visualNotifications: false } }
    const { settings, hasInvalidData } = sanitizeSettings(saved)
    expect(hasInvalidData).toBe(false)
    expect(settings.preferences.amountFormat).toBe('dot')
    expect(settings.preferences.visualNotifications).toBe(false)
    expect(settings.general.description).toBe('Une description valable.')
  })

  it('champs invalides remplacés par les valeurs par défaut, champs valides conservés', () => {
    const { settings, hasInvalidData } = sanitizeSettings({
      general: { description: 'x', projectInfo: 'Un projet' },
      preferences: { amountFormat: 'pirate', visualNotifications: false },
    })
    expect(hasInvalidData).toBe(true)
    expect(settings.general.description).toBe(DEFAULT_SETTINGS.general.description)
    expect(settings.general.projectInfo).toBe('Un projet')
    expect(settings.preferences.amountFormat).toBe('space')
    expect(settings.preferences.visualNotifications).toBe(false)
  })

  it('structures absurdes : valeurs par défaut, sans plantage', () => {
    ;[null, undefined, 42, 'texte', [], { general: 5, preferences: [] }].forEach((raw) => {
      const { settings } = sanitizeSettings(raw)
      expect(settings.preferences.amountFormat).toBe('space')
      expect(validateGeneralInfo(settings.general).isValid).toBe(true)
    })
  })

  it('champs inconnus ignorés', () => {
    const { settings } = sanitizeSettings({ general: { ...DEFAULT_SETTINGS.general, admin: true }, preferences: { ...DEFAULT_SETTINGS.preferences, role: 'root' } })
    expect(Object.keys(settings.general)).toEqual(['description', 'projectInfo'])
    expect(Object.keys(settings.preferences)).toEqual(['amountFormat', 'visualNotifications'])
  })

  it('détecte les modifications non enregistrées', () => {
    expect(areValuesEqual(DEFAULT_SETTINGS.general, { ...DEFAULT_SETTINGS.general })).toBe(true)
    expect(areValuesEqual(DEFAULT_SETTINGS.general, { ...DEFAULT_SETTINGS.general, projectInfo: 'autre' })).toBe(false)
  })
})

describe('format des montants', () => {
  afterEach(() => setAmountSeparator('\u00A0'))

  it('par défaut : espace insécable', () => {
    expect(formatNumber(410000)).toBe('410\u00A0000')
    expect(formatCurrency(410000)).toBe('410\u00A0000 FCFA')
  })

  it('point et sans séparateur', () => {
    setAmountSeparator('.')
    expect(formatCurrency(410000)).toBe('410.000 FCFA')
    setAmountSeparator('')
    expect(formatNumber(1234567)).toBe('1234567')
  })
})
