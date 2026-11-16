import { z } from 'zod'
import { MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH } from '../config/constants.js'

export const loginSchema = z
  .object({
    email: z
      .string({ message: "L'email est obligatoire." })
      .trim()
      .min(1, "L'email est obligatoire.")
      .max(MAX_EMAIL_LENGTH, "L'email est invalide."),
    password: z
      .string({ message: 'Le mot de passe est obligatoire.' })
      .min(1, 'Le mot de passe est obligatoire.')
      .max(MAX_PASSWORD_LENGTH, 'Le mot de passe est invalide.'),
  })
  .strict()
