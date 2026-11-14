import { z } from 'zod'
import { isBusinessDate } from '../models/shared/validators.js'
import { PERIOD_KEYS } from '../utils/businessDates.js'
import { DIRECTIONS, MOVEMENT_TYPES, NO_ACTIVITY, SORTS } from '../services/treasury/ledger.js'

const businessDate = (label) => z.string({ message: `${label} doit être une date (AAAA-MM-JJ).` }).refine((value) => isBusinessDate(value), `${label} doit être une date valide (AAAA-MM-JJ).`)
const intParam = (label, { min, max, fallback }) =>
  z.string().regex(/^\d{1,6}$/, `${label} est invalide.`).transform(Number).refine((value) => value >= min && value <= max, `${label} est invalide.`).optional().transform((value) => value ?? fallback)

/** GET /history : tous les paramètres sont facultatifs ; un paramètre inconnu ou répété est refusé. */
export const listHistoryQuerySchema = z
  .object({
    search: z.string().trim().max(100, 'La recherche est limitée à 100 caractères.').optional(),
    type: z.enum(MOVEMENT_TYPES, { message: `Le type doit valoir : ${MOVEMENT_TYPES.join(', ')}.` }).optional(),
    direction: z.enum(DIRECTIONS, { message: `Le sens doit valoir : ${DIRECTIONS.join(', ')}.` }).optional(),
    partnerId: z.string().regex(/^[a-f0-9]{24}$/, "L'identifiant de l'associé est invalide.").optional(),
    activityId: z.union([z.literal(NO_ACTIVITY), z.string().regex(/^[a-f0-9]{24}$/)], { message: `L'identifiant de l'activité est invalide (ou « ${NO_ACTIVITY} »).` }).optional(),
    period: z.enum(PERIOD_KEYS, { message: `La période doit valoir : ${PERIOD_KEYS.join(', ')}.` }).optional().default('all'),
    from: businessDate('La date de début').optional(),
    to: businessDate('La date de fin').optional(),
    sort: z.enum(SORTS, { message: `Le tri doit valoir : ${SORTS.join(', ')}.` }).optional().default('date_desc'),
    page: intParam('La page', { min: 1, max: 100000, fallback: 1 }),
    limit: intParam('Le nombre par page', { min: 1, max: 100, fallback: 20 }),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.from && value.to && value.to < value.from) ctx.addIssue({ code: 'custom', path: ['to'], message: 'La date de fin ne peut pas précéder la date de début.' })
    if (value.period === 'custom' && !value.from && !value.to) ctx.addIssue({ code: 'custom', path: ['period'], message: 'Une période personnalisée exige une date de début ou de fin.' })
  })
