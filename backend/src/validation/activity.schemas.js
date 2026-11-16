import { z } from 'zod'
import { isBusinessDate } from '../models/shared/validators.js'
import { ACTIVITY_STATUSES } from '../services/activities/rules.js'

const OBJECT_ID = /^[a-f0-9]{24}$/
export const isObjectId = (value) => typeof value === 'string' && OBJECT_ID.test(value)

const businessDate = (label) => z.string({ message: `${label} doit être une date (AAAA-MM-JJ).` }).refine((value) => isBusinessDate(value), `${label} doit être une date valide (AAAA-MM-JJ).`)
const optionalText = (label, max) =>
  z.string({ message: `${label} est invalide.` }).trim().max(max, `${label} est limité à ${max} caractères.`)

const name = z.string({ message: "Le nom de l'activité est obligatoire." }).trim().min(2, "Le nom de l'activité doit contenir au moins 2 caractères.").max(100, "Le nom de l'activité est limité à 100 caractères.")
const description = optionalText('La description', 1000)
const category = optionalText('La catégorie', 60)

const endsAfterStart = (value, ctx) => {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'La date de fin ne peut pas précéder la date de début.' })
  }
}

// Création : une activité naît toujours ACTIVE ; les champs financiers, d'audit ou de statut avancé sont refusés (.strict()).
export const createActivitySchema = z
  .object({
    name,
    description: description.optional().default(''),
    category: category.nullish().transform((value) => (value ? value : null)),
    startDate: businessDate('La date de démarrage'),
    endDate: businessDate('La date de fin').nullish().transform((value) => value ?? null),
    status: z.literal('ACTIVE', { message: 'Une nouvelle activité est toujours active.' }).optional(),
  })
  .strict()
  .superRefine(endsAfterStart)

export const updateActivitySchema = z
  .object({
    name: name.optional(),
    description: description.optional(),
    category: category.nullish().transform((value) => (value === undefined ? undefined : value || null)).optional(),
    startDate: businessDate('La date de démarrage').optional(),
    endDate: businessDate('La date de fin').nullish().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Aucune modification fournie.')
  .superRefine(endsAfterStart)

export const emptyActionSchema = z.object({}).strict()
export const completeActivitySchema = z.object({ endDate: businessDate('La date de fin').optional() }).strict()
export const reopenActivitySchema = z
  .object({ reason: z.string({ message: 'Le motif de réouverture est obligatoire.' }).trim().min(3, 'Le motif de réouverture est obligatoire (3 caractères minimum).').max(300, 'Le motif est limité à 300 caractères.') })
  .strict()

const SORTS = ['start_desc', 'start_asc', 'name_asc', 'name_desc', 'created_desc']
const intParam = (label, { min, max, fallback }) =>
  z.string().regex(/^\d{1,6}$/, `${label} est invalide.`).transform(Number).refine((value) => value >= min && value <= max, `${label} est invalide.`).optional().transform((value) => value ?? fallback)

export const listActivitiesQuerySchema = z
  .object({
    search: z.string().trim().max(100, 'La recherche est limitée à 100 caractères.').optional(),
    status: z.enum(ACTIVITY_STATUSES, { message: `Le statut doit valoir : ${ACTIVITY_STATUSES.join(', ')}.` }).optional(),
    category: z.string().trim().max(60, 'La catégorie est invalide.').optional(),
    sort: z.enum(SORTS, { message: `Le tri doit valoir : ${SORTS.join(', ')}.` }).optional().default('start_desc'),
    page: intParam('La page', { min: 1, max: 100000, fallback: 1 }),
    pageSize: intParam('La taille de page', { min: 1, max: 50, fallback: 12 }),
  })
  .strict()
