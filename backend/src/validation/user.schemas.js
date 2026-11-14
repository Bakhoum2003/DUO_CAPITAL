import { z } from 'zod'
import { MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH } from '../config/constants.js'
import { isEmail } from '../models/shared/validators.js'

const currentPassword = z
  .string({ message: 'Le mot de passe actuel est obligatoire.' })
  .min(1, 'Le mot de passe actuel est obligatoire.')
  .max(MAX_PASSWORD_LENGTH, 'Le mot de passe actuel est invalide.')

// Seuls ces champs sont modifiables ; tout autre champ (role, partnerNumber, status, passwordHash…) est refusé par `.strict()`.
export const updateProfileSchema = z
  .object({
    name: z
      .string({ message: 'Le nom est obligatoire.' })
      .trim()
      .min(2, 'Le nom doit contenir au moins 2 caractères.')
      .max(80, 'Le nom est limité à 80 caractères.'),
  })
  .strict()

export const changeEmailSchema = z
  .object({
    email: z
      .string({ message: "L'email est obligatoire." })
      .trim()
      .max(MAX_EMAIL_LENGTH, "L'email est invalide.")
      .refine((value) => isEmail(value), "L'email est invalide."),
    currentPassword,
  })
  .strict()

// La politique de mot de passe est appliquée par le service (messages détaillés par règle).
export const changePasswordSchema = z
  .object({
    currentPassword,
    newPassword: z
      .string({ message: 'Le nouveau mot de passe est obligatoire.' })
      .min(1, 'Le nouveau mot de passe est obligatoire.')
      .max(MAX_PASSWORD_LENGTH, 'Le nouveau mot de passe est invalide.'),
  })
  .strict()

export const accountStatusSchema = z.object({ currentPassword }).strict()
