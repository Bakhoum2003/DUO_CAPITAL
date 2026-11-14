import { z } from 'zod'
import { MAX_FCFA_AMOUNT } from '../models/shared/constants.js'
import { isPeriod } from '../models/shared/validators.js'
import { diffDays, isValidDate, MAX_CUSTOM_RANGE_DAYS } from '../utils/businessDates.js'

const OBJECT_ID = /^[a-f0-9]{24}$/
const partnerId = z.string({ message: "L'associé est obligatoire." }).regex(OBJECT_ID, "L'associé est invalide.")
const businessDate = (label) => z.string({ message: `${label} est obligatoire.` }).refine((value) => isValidDate(value), `${label} doit être une date valide (AAAA-MM-JJ).`)
const period = z.string({ message: 'Le mois concerné est obligatoire.' }).refine((value) => isPeriod(value), 'Le mois concerné doit être au format AAAA-MM.')

// Création : champs inconnus refusés (un `recordedBy` ou un `deletedAt` envoyé par le client ne passe pas).
export const createContributionSchema = z
  .object({
    partnerId,
    amount: z
      .number({ message: 'Le montant doit être un nombre.' })
      .int('Le montant doit être un nombre entier de FCFA (sans décimale).')
      .positive('Le montant doit être strictement positif.')
      .max(MAX_FCFA_AMOUNT, 'Le montant est trop élevé.'),
    contributionDate: businessDate('La date du versement'),
    period,
    note: z
      .string({ message: 'La note est invalide.' })
      .trim()
      .max(300, 'La note est limitée à 300 caractères.')
      .nullish()
      .transform((value) => (value ? value : null)),
    confirmDuplicate: z.boolean({ message: 'La confirmation est invalide.' }).optional().default(false),
  })
  .strict()

const intParam = (label, { min, max, fallback }) =>
  z
    .string()
    .regex(/^\d{1,6}$/, `${label} est invalide.`)
    .transform(Number)
    .refine((value) => value >= min && value <= max, `${label} est invalide.`)
    .optional()
    .transform((value) => value ?? fallback)

export const listContributionsQuerySchema = z
  .object({
    partnerId: partnerId.optional(),
    period: period.optional(),
    year: z.string().regex(/^\d{4}$/, "L'année est invalide.").refine((value) => Number(value) >= 2000 && Number(value) <= 2100, "L'année est invalide.").optional(),
    from: businessDate('La date de début').optional(),
    to: businessDate('La date de fin').optional(),
    page: intParam('La page', { min: 1, max: 100000, fallback: 1 }),
    pageSize: intParam('La taille de page', { min: 1, max: 100, fallback: 20 }),
  })
  .strict()
  .superRefine((query, ctx) => {
    if (query.from && query.to) {
      if (query.from > query.to) ctx.addIssue({ code: 'custom', path: ['to'], message: 'La date de fin ne peut pas précéder la date de début.' })
      else if (diffDays(query.from, query.to) > MAX_CUSTOM_RANGE_DAYS) ctx.addIssue({ code: 'custom', path: ['to'], message: 'La période est limitée à 10 ans.' })
    }
  })

export const contributionIdParamSchema = z.object({ id: z.string().regex(OBJECT_ID) }).strict()
