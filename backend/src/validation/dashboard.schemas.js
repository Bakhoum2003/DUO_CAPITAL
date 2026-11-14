import { z } from 'zod'
import { MAX_CUSTOM_RANGE_DAYS, PERIOD_KEYS, diffDays, isValidDate } from '../utils/businessDates.js'

const dateParam = z.string().refine((value) => isValidDate(value), 'Date invalide : utilisez le format AAAA-MM-JJ.')

// Paramètres d'URL du dashboard. Tout paramètre inconnu est refusé ; from/to n'ont de sens que pour « custom ».
export const dashboardQuerySchema = z
  .object({
    period: z.enum(PERIOD_KEYS, { message: `La période doit valoir : ${PERIOD_KEYS.join(', ')}.` }).default('all'),
    from: dateParam.optional(),
    to: dateParam.optional(),
  })
  .strict()
  .superRefine((query, ctx) => {
    if (query.period !== 'custom') {
      if (query.from !== undefined || query.to !== undefined) {
        ctx.addIssue({ code: 'custom', path: ['period'], message: 'Les dates from et to ne sont acceptées que pour la période « custom ».' })
      }
      return
    }
    if (!query.from) ctx.addIssue({ code: 'custom', path: ['from'], message: 'La date de début est obligatoire pour une période personnalisée.' })
    if (!query.to) ctx.addIssue({ code: 'custom', path: ['to'], message: 'La date de fin est obligatoire pour une période personnalisée.' })
    if (query.from && query.to) {
      if (query.from > query.to) ctx.addIssue({ code: 'custom', path: ['to'], message: 'La date de fin ne peut pas précéder la date de début.' })
      else if (diffDays(query.from, query.to) > MAX_CUSTOM_RANGE_DAYS) {
        ctx.addIssue({ code: 'custom', path: ['to'], message: 'La période personnalisée est limitée à 10 ans.' })
      }
    }
  })
