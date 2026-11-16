import {
  MAX_CONTRIBUTION_AMOUNT,
  MAX_DESCRIPTION_LENGTH,
  MIN_CONTRIBUTION_DATE,
} from '../constants/contributionSettings'
import { formatNumber } from './formatters'

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function parseAmount(rawAmount) {
  const digitsOnly = String(rawAmount).replace(/\s/g, '')
  return /^\d+$/.test(digitsOnly) ? Number(digitsOnly) : null
}

/**
 * Valide le formulaire d'ajout / modification d'une cotisation.
 * Retourne un objet { champ: 'message' } ne contenant que les champs en erreur.
 *
 * @param values { associateId, amount, date, description }
 * @param todayIso date du jour (« AAAA-MM-JJ ») : une cotisation ne peut pas être datée du futur
 * @param associateIds identifiants d'associés autorisés
 */
export function validateContributionForm({ associateId, amount, date, description }, todayIso, associateIds) {
  const errors = {}

  if (!associateId) {
    errors.associateId = "Veuillez choisir l'associé concerné."
  } else if (!associateIds.includes(associateId)) {
    errors.associateId = 'Associé inconnu.'
  }

  const parsedAmount = parseAmount(amount)
  if (!String(amount).trim()) {
    errors.amount = 'Le montant est obligatoire.'
  } else if (parsedAmount === null) {
    errors.amount = 'Saisissez un montant en chiffres, sans décimale (ex. 15 000).'
  } else if (parsedAmount <= 0) {
    errors.amount = 'Le montant doit être supérieur à 0.'
  } else if (parsedAmount > MAX_CONTRIBUTION_AMOUNT) {
    errors.amount = `Le montant ne peut pas dépasser ${formatNumber(MAX_CONTRIBUTION_AMOUNT)} FCFA.`
  }

  if (!date) {
    errors.date = 'La date de la cotisation est obligatoire.'
  } else if (!ISO_DATE_PATTERN.test(date) || Number.isNaN(Date.parse(date))) {
    errors.date = 'Date invalide.'
  } else if (date > todayIso) {
    errors.date = 'La date ne peut pas être dans le futur.'
  } else if (date < MIN_CONTRIBUTION_DATE) {
    errors.date = 'Cette date est trop ancienne.'
  }

  if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `La description ne doit pas dépasser ${MAX_DESCRIPTION_LENGTH} caractères.`
  }

  return errors
}
