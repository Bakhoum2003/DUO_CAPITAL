import {
  MAX_BUSINESS_AMOUNT,
  MAX_BUSINESS_DESCRIPTION_LENGTH,
  MAX_BUSINESS_NAME_LENGTH,
  MAX_OPERATION_DESCRIPTION_LENGTH,
  MIN_BUSINESS_DATE,
} from '../constants/businessSettings'
import { normalizeSearchText } from './contributionCalculations'
import { parseAmount } from './contributionValidators'
import { formatNumber, formatShortDate } from './formatters'

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function validateAmount(rawAmount) {
  const parsedAmount = parseAmount(rawAmount)
  if (!String(rawAmount).trim()) return 'Le montant est obligatoire.'
  if (parsedAmount === null) return 'Saisissez un montant en chiffres, sans décimale (ex. 15 000).'
  if (parsedAmount <= 0) return 'Le montant doit être supérieur à 0.'
  if (parsedAmount > MAX_BUSINESS_AMOUNT) {
    return `Le montant ne peut pas dépasser ${formatNumber(MAX_BUSINESS_AMOUNT)} FCFA.`
  }
  return ''
}

function isValidIsoDate(date) {
  return ISO_DATE_PATTERN.test(date) && !Number.isNaN(Date.parse(date))
}

/**
 * Valide le formulaire d'un business (ajout ou modification).
 * Retourne { champ: 'message' } avec uniquement les champs en erreur.
 *
 * @param values { name, category, description, launchDate, initialInvestment, responsibleId, status }
 * @param context.todayIso date du jour (« AAAA-MM-JJ ») : un lancement ne peut pas être dans le futur
 * @param context.categoryValues valeurs de catégorie autorisées
 * @param context.statusValues valeurs de statut autorisées
 * @param context.associateIds identifiants d'associés autorisés (le responsable est facultatif)
 * @param context.otherBusinessNames noms des autres business (pas de doublon)
 * @param context.earliestOperationDate date de la 1re opération du business modifié (« » si aucune)
 */
export function validateBusinessForm(values, context) {
  const { name, category, description, launchDate, initialInvestment, responsibleId, status } = values
  const { todayIso, categoryValues, statusValues, associateIds, otherBusinessNames, earliestOperationDate = '' } = context
  const errors = {}

  const trimmedName = name.trim()
  if (!trimmedName) {
    errors.name = 'Le nom du business est obligatoire.'
  } else if (trimmedName.length < 2) {
    errors.name = 'Le nom doit contenir au moins 2 caractères.'
  } else if (trimmedName.length > MAX_BUSINESS_NAME_LENGTH) {
    errors.name = `Le nom ne doit pas dépasser ${MAX_BUSINESS_NAME_LENGTH} caractères.`
  } else if (otherBusinessNames.some((otherName) => normalizeSearchText(otherName) === normalizeSearchText(trimmedName))) {
    errors.name = 'Un business porte déjà ce nom.'
  }

  if (!category) {
    errors.category = 'Veuillez choisir une catégorie.'
  } else if (!categoryValues.includes(category)) {
    errors.category = 'Catégorie inconnue.'
  }

  if (!statusValues.includes(status)) {
    errors.status = 'Veuillez choisir un statut.'
  }

  if (description.trim().length > MAX_BUSINESS_DESCRIPTION_LENGTH) {
    errors.description = `La description ne doit pas dépasser ${MAX_BUSINESS_DESCRIPTION_LENGTH} caractères.`
  }

  if (!launchDate) {
    errors.launchDate = 'La date de lancement est obligatoire.'
  } else if (!isValidIsoDate(launchDate)) {
    errors.launchDate = 'Date invalide.'
  } else if (launchDate > todayIso) {
    errors.launchDate = 'La date de lancement ne peut pas être dans le futur.'
  } else if (launchDate < MIN_BUSINESS_DATE) {
    errors.launchDate = 'Cette date est trop ancienne.'
  } else if (earliestOperationDate && launchDate > earliestOperationDate) {
    errors.launchDate = `Le lancement ne peut pas être postérieur à la première opération (${formatShortDate(earliestOperationDate)}).`
  }

  const amountError = validateAmount(initialInvestment)
  if (amountError) errors.initialInvestment = amountError

  if (responsibleId && !associateIds.includes(responsibleId)) {
    errors.responsibleId = 'Associé inconnu.'
  }

  return errors
}

/**
 * Valide le formulaire d'une opération financière (investissement, dépense ou recette).
 *
 * @param values { type, amount, date, associateId, expenseCategory, description }
 * @param context.todayIso date du jour (« AAAA-MM-JJ »)
 * @param context.launchDate date de lancement du business : une opération ne peut pas la précéder
 * @param context.associateIds identifiants d'associés autorisés
 * @param context.expenseCategoryValues catégories de dépense autorisées (obligatoire pour une dépense)
 */
export function validateOperationForm(values, context) {
  const { type, amount, date, associateId, expenseCategory, description } = values
  const { todayIso, launchDate, associateIds, expenseCategoryValues } = context
  const errors = {}

  const amountError = validateAmount(amount)
  if (amountError) errors.amount = amountError

  if (!date) {
    errors.date = "La date de l'opération est obligatoire."
  } else if (!isValidIsoDate(date)) {
    errors.date = 'Date invalide.'
  } else if (date > todayIso) {
    errors.date = 'La date ne peut pas être dans le futur.'
  } else if (launchDate && date < launchDate) {
    errors.date = `La date ne peut pas précéder le lancement du business (${formatShortDate(launchDate)}).`
  }

  if (!associateId) {
    errors.associateId = "Veuillez choisir l'associé concerné."
  } else if (!associateIds.includes(associateId)) {
    errors.associateId = 'Associé inconnu.'
  }

  if (type === 'expense') {
    if (!expenseCategory) {
      errors.expenseCategory = 'Veuillez choisir une catégorie de dépense.'
    } else if (!expenseCategoryValues.includes(expenseCategory)) {
      errors.expenseCategory = 'Catégorie de dépense inconnue.'
    }
  }

  if (description.trim().length > MAX_OPERATION_DESCRIPTION_LENGTH) {
    errors.description = `La description ne doit pas dépasser ${MAX_OPERATION_DESCRIPTION_LENGTH} caractères.`
  }

  return errors
}
