
import mongoose from 'mongoose'
import { isBusinessDate, isFcfaAmount, isPeriod } from './validators.js'

const { Schema } = mongoose

export function fcfaAmountField() {
  return {
    type: Number,
    required: [true, 'Le montant est obligatoire.'],
    min: [1, 'Le montant doit être strictement positif.'],
    validate: { validator: isFcfaAmount, message: 'Le montant doit être un nombre entier de FCFA (sans décimale).' },
  }
}

export function businessDateField({ required = false, label = 'La date' } = {}) {
  return {
    type: String,
    required: required ? [true, `${label} est obligatoire.`] : false,
    default: required ? undefined : null,
    validate: {
      validator: (value) => value == null || isBusinessDate(value),
      message: `${label} doit être une date valide au format AAAA-MM-JJ.`,
    },
  }
}

export function periodField() {
  return {
    type: String,
    required: [true, 'La période est obligatoire.'],
    validate: { validator: isPeriod, message: 'La période doit être au format AAAA-MM.' },
  }
}

export function userRefField({ required = true, label = "L'utilisateur", immutable = false } = {}) {
  return {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: required ? [true, `${label} est obligatoire.`] : false,
    default: required ? undefined : null,
    immutable,
  }
}
