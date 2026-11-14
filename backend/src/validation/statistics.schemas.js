import { z } from 'zod'
import { MAX_CUSTOM_RANGE_DAYS, diffDays, isValidDate } from '../utils/businessDates.js'
import { STATISTICS_PERIOD_KEYS } from '../services/statistics/periods.js'

const dateParam = (label) => z.string({ message: `${label} doit être une date (AAAA-MM-JJ).` }).refine((value) => isValidDate(value), `${label} est invalide : utilisez une date réelle au format AAAA-MM-JJ.`)

/** GET /statistics : `from` et `to` sont obligatoires pour « custom » et refusés sinon ; tout paramètre inconnu ou répété est refusé. */
export const statisticsQuerySchema = z
  .object({
    period: z.enum(STATISTICS_PERIOD_KEYS, { message: `La période doit valoir : ${STATISTICS_PERIOD_KEYS.join(', ')}.` }).default('all'),
    from: dateParam('La date de début').optional(),
    to: dateParam('La date de fin').optional(),
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
      else if (diffDays(query.from, query.to) > MAX_CUSTOM_RANGE_DAYS) ctx.addIssue({ code: 'custom', path: ['to'], message: 'La période personnalisée est limitée à 10 ans.' })
    }
  })
