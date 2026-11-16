import mongoose from 'mongoose'
import { PARTNER_NUMBERS, USER_STATUSES } from './shared/constants.js'
import { forbidPhysicalDeletePlugin, toJSONPlugin } from './shared/plugins.js'
import { isEmail, isPasswordHash } from './shared/validators.js'

const { Schema } = mongoose

/**
 * Associé (deux au total, mêmes permissions : aucun rôle).
 * - `partnerNumber` (1 ou 2, unique, immuable) garantit EN BASE qu'il n'existe jamais plus de deux comptes.
 * - Aucune inscription publique : les comptes sont créés par un script contrôlé (phase B2), jamais par l'API.
 * - `passwordHash` : empreinte argon2/bcrypt uniquement ; absent des lectures par défaut et de toute sortie JSON.
 */
const userSchema = new Schema(
  {
    partnerNumber: {
      type: Number,
      required: [true, "Le numéro d'associé est obligatoire."],
      validate: { validator: (value) => PARTNER_NUMBERS.includes(value), message: "Le numéro d'associé doit valoir 1 ou 2." },
      immutable: true,
    },
    name: {
      type: String,
      required: [true, 'Le nom est obligatoire.'],
      trim: true,
      minlength: [2, 'Le nom doit contenir au moins 2 caractères.'],
      maxlength: [80, 'Le nom est limité à 80 caractères.'],
    },
    email: {
      type: String,
      required: [true, "L'email est obligatoire."],
      trim: true,
      lowercase: true,
      validate: { validator: isEmail, message: "L'email est invalide." },
    },
    passwordHash: {
      type: String,
      required: [true, "L'empreinte du mot de passe est obligatoire."],
      select: false,
      validate: { validator: isPasswordHash, message: "Le mot de passe doit être stocké sous forme d'empreinte (argon2 ou bcrypt)." },
    },
    status: {
      type: String,
      enum: { values: USER_STATUSES, message: "L'état du compte est invalide." },
      default: 'ACTIVE',
    },
    mustChangePassword: { type: Boolean, default: false },
    passwordChangedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: [0, 'Le compteur de tentatives ne peut pas être négatif.'],
      validate: { validator: Number.isInteger, message: 'Le compteur de tentatives doit être un entier.' },
    },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
)

userSchema.index({ email: 1 }, { unique: true, name: 'uniq_user_email' })
userSchema.index({ partnerNumber: 1 }, { unique: true, name: 'uniq_user_partner_number' })

userSchema.plugin(forbidPhysicalDeletePlugin, {
  code: 'USER_DELETE_FORBIDDEN',
  message: 'Un compte ne se supprime pas : désactivez-le. Les données financières et l’historique sont conservés.',
})
userSchema.plugin(toJSONPlugin)

export const User = mongoose.models.User ?? mongoose.model('User', userSchema)
export { userSchema }
