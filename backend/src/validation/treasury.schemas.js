import { z } from 'zod'
import { isBusinessDate } from '../models/shared/validators.js'
import { DIRECTIONS, MOVEMENT_TYPES, SORTS } from '../services/treasury/ledger.js'

const businessDate = (label) => z.string({ message: `${label} doit être une date (AAAA-MM-JJ).` }).refine((value) => isBusinessDate(value), `${label} doit être une date valide (AAAA-MM-JJ).`)
const intParam = (label, { min, max, fallback }) =>
  z.string().regex(/^\d{1,6}$/, `${label} est invalide.`).transform(Number).refine((value) => value >= min && value <= max, `${label} est invalide.`).optional().transform((value) => value ?? fallback)

/** GET /treasury/movements : tous les paramètres sont facultatifs ; un paramètre inconnu ou répété est refusé. */
export const listMovementsQuerySchema = z
  .object({
    search: z.string().trim().max(100, 'La recherche est limitée à 100 caractères.').optional(),
    type: z.enum(MOVEMENT_TYPES, { message: `Le type doit valoir : ${MOVEMENT_TYPES.join(', ')}.` }).optional(),
    direction: z.enum(DIRECTIONS, { message: `Le sens doit valoir : ${DIRECTIONS.join(', ')}.` }).optional(),
    category: z.string().trim().max(60, 'La catégorie est invalide.').optional(),
    partnerId: z.string().regex(/^[a-f0-9]{24}$/, "L'identifiant de l'associé est invalide.").optional(),
    from: businessDate('La date de début').optional(),
    to: businessDate('La date de fin').optional(),
    sort: z.enum(SORTS, { message: `Le tri doit valoir : ${SORTS.join(', ')}.` }).optional().default('date_desc'),
    page: intParam('La page', { min: 1, max: 100000, fallback: 1 }),
    pageSize: intParam('La taille de page', { min: 1, max: 100, fallback: 20 }),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.from && value.to && value.to < value.from) ctx.addIssue({ code: 'custom', path: ['to'], message: 'La date de fin ne peut pas précéder la date de début.' })
  })

export const movementTypeParamSchema = z.enum(MOVEMENT_TYPES)
