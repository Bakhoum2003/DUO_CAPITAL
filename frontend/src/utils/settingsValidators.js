// Validation des paramètres (fonctions pures, testables).
// Chaque validateur renvoie { isValid, errors, values } : `values` est la version nettoyée, prête à être enregistrée.

import { MAX_CONTRIBUTION_AMOUNT } from '../constants/contributionSettings'
import {
  AMOUNT_FORMATS,
  ASSOCIATE_NAME_MAX_LENGTH,
  ASSOCIATE_NAME_MIN_LENGTH,
  DEFAULT_SETTINGS,
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  EXPECTED_ASSOCIATE_COUNT,
  PROJECT_INFO_MAX_LENGTH,
} from '../constants/settingsSettings'

// Retire les espaces en début/fin et réduit les espaces multiples (les retours à la ligne sont conservés).
export function normalizeText(value) {
  if (typeof value !== 'string') return ''
  return value
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim()
}

/* ---------- Informations générales ---------- */

export function validateGeneralInfo(input) {
  const values = {
    description: normalizeText(input?.description),
    projectInfo: normalizeText(input?.projectInfo),
  }
  const errors = {}

  if (!values.description) errors.description = 'La description du fonds est obligatoire.'
  else if (values.description.length < DESCRIPTION_MIN_LENGTH) {
    errors.description = `La description doit contenir au moins ${DESCRIPTION_MIN_LENGTH} caractères.`
  } else if (values.description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `La description ne peut pas dépasser ${DESCRIPTION_MAX_LENGTH} caractères.`
  }

  if (values.projectInfo.length > PROJECT_INFO_MAX_LENGTH) {
    errors.projectInfo = `Les informations du projet ne peuvent pas dépasser ${PROJECT_INFO_MAX_LENGTH} caractères.`
  }

  return { isValid: Object.keys(errors).length === 0, errors, values }
}

/* ---------- Associés ---------- */

const NAME_PATTERN = /^\p{L}[\p{L}'’ -]*$/u

// Retourne un message d'erreur, ou '' si le nom est correct (lettres, espaces, tirets, apostrophes).
export function validateAssociateName(name) {
  const value = normalizeText(name)
  if (!value) return "Le nom de l'associé est obligatoire."
  if (value.length < ASSOCIATE_NAME_MIN_LENGTH) return `Le nom doit contenir au moins ${ASSOCIATE_NAME_MIN_LENGTH} caractères.`
  if (value.length > ASSOCIATE_NAME_MAX_LENGTH) return `Le nom ne peut pas dépasser ${ASSOCIATE_NAME_MAX_LENGTH} caractères.`
  if (!NAME_PATTERN.test(value)) return 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes.'
  return ''
}

/**
 * Cohérence de la liste des associés : exactement deux, noms valides et distincts, identifiants distincts.
 * @param associates [{ id, name }]
 * @returns liste de messages d'erreur (vide = correct)
 */
export function validateAssociates(associates) {
  if (!Array.isArray(associates)) return ['La liste des associés est invalide.']

  const errors = []
  if (associates.length !== EXPECTED_ASSOCIATE_COUNT) {
    errors.push(`DUO CAPITAL compte exactement ${EXPECTED_ASSOCIATE_COUNT} associés.`)
  }
  associates.forEach((associate) => {
    const message = validateAssociateName(associate?.name)
    if (message) errors.push(`${associate?.name || 'Associé sans nom'} : ${message}`)
  })

  const names = associates.map((associate) => normalizeText(associate?.name).toLowerCase())
  const ids = associates.map((associate) => associate?.id)
  if (new Set(names).size !== names.length) errors.push('Deux associés ne peuvent pas porter le même nom.')
  if (new Set(ids).size !== ids.length) errors.push('Deux associés ne peuvent pas avoir le même identifiant.')

  return errors
}

/* ---------- Objectifs de cotisation ---------- */

/**
 * Vérifie les objectifs : cotisation individuelle entière, positive et raisonnable ;
 * objectif collectif = cotisation individuelle × nombre d'associés.
 */
export function validateObjectives({ individual, collective, associateCount }) {
  const errors = []

  if (!Number.isInteger(individual) || individual <= 0) {
    errors.push("La cotisation mensuelle individuelle doit être un nombre entier supérieur à zéro.")
  } else if (individual > MAX_CONTRIBUTION_AMOUNT) {
    errors.push('La cotisation mensuelle individuelle est trop élevée.')
  } else if (collective !== individual * associateCount) {
    errors.push("L'objectif collectif doit être égal à la cotisation individuelle multipliée par le nombre d'associés.")
  }

  return { isValid: errors.length === 0, errors }
}

// Part de chaque associé dans le fonds, en %, selon le nombre d'associés (2 associés = 50 %).
export function getParticipationPercent(associateCount) {
  return associateCount > 0 ? Math.round(100 / associateCount) : 0
}

/* ---------- Préférences ---------- */

export function validatePreferences(input) {
  const errors = {}
  const amountFormat = input?.amountFormat
  const visualNotifications = input?.visualNotifications

  if (!Object.hasOwn(AMOUNT_FORMATS, amountFormat)) errors.amountFormat = "Ce format d'affichage des montants n'existe pas."
  if (typeof visualNotifications !== 'boolean') errors.visualNotifications = 'La préférence de notifications est invalide.'

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    values: { amountFormat, visualNotifications },
  }
}

/* ---------- Paramètres enregistrés ---------- */

/**
 * Rend utilisable n'importe quelle donnée lue dans le stockage local : chaque champ invalide est remplacé par sa
 * valeur par défaut, les champs inconnus sont ignorés (jamais de plantage, jamais de valeur dangereuse).
 * @returns { settings, hasInvalidData }
 */
export function sanitizeSettings(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const generalSource = source.general && typeof source.general === 'object' ? source.general : {}
  const preferencesSource = source.preferences && typeof source.preferences === 'object' ? source.preferences : {}

  const generalCandidate = {
    description: generalSource.description ?? DEFAULT_SETTINGS.general.description,
    projectInfo: generalSource.projectInfo ?? DEFAULT_SETTINGS.general.projectInfo,
  }
  const general = validateGeneralInfo(generalCandidate)
  const preferences = validatePreferences({ ...DEFAULT_SETTINGS.preferences, ...preferencesSource })

  const settings = {
    general: {
      description: general.errors.description ? DEFAULT_SETTINGS.general.description : general.values.description,
      projectInfo: general.errors.projectInfo ? DEFAULT_SETTINGS.general.projectInfo : general.values.projectInfo,
    },
    preferences: {
      amountFormat: preferences.errors.amountFormat ? DEFAULT_SETTINGS.preferences.amountFormat : preferences.values.amountFormat,
      visualNotifications: preferences.errors.visualNotifications
        ? DEFAULT_SETTINGS.preferences.visualNotifications
        : preferences.values.visualNotifications,
    },
  }

  const hasInvalidData = Boolean(raw) && (!general.isValid || !preferences.isValid)
  return { settings, hasInvalidData }
}

// Deux groupes de valeurs sont-ils identiques ? (détecte les modifications non enregistrées)
export function areValuesEqual(first, second) {
  return JSON.stringify(first) === JSON.stringify(second)
}
