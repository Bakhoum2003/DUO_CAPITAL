import { z } from 'zod'
import { MAX_FCFA_AMOUNT } from '../models/shared/constants.js'
import { isBusinessDate } from '../models/shared/validators.js'
import { WITHDRAWAL_SORTS } from '../services/withdrawals/query.js'

const OBJECT_ID = /^[a-f0-9]{24}$/
const businessDate = (label) => z.string({ message: `${label} est obligatoire.` }).refine((value) => isBusinessDate(value), `${label} doit être une date valide (AAAA-MM-JJ).`)
const beneficiaryId = z.string({ message: 'Le bénéficiaire est obligatoire.' }).regex(OBJECT_ID, 'Le bénéficiaire est invalide.')
const amount = z
  .number({ message: 'Le montant doit être un nombre.' })
  .int('Le montant doit être un nombre entier de FCFA (sans décimale).')
  .positive('Le montant doit être strictement positif.')
  .max(MAX_FCFA_AMOUNT, 'Le montant est trop élevé.')
const reason = z
  .string({ message: 'Le motif est invalide.' })
  .trim()
  .max(300, 'Le motif est limité à 300 caractères.')
  .nullish()
  .transform((value) => (value ? value : null))

// Création : champs inconnus refusés (un `recordedBy`, un `deletedAt` ou un solde envoyé par le client ne passe pas).
export const createWithdrawalSchema = z.object({ beneficiaryId, amount, withdrawalDate: businessDate('La date du retrait'), reason }).strict()

export const updateWithdrawalSchema = z
  .object({ beneficiaryId: beneficiaryId.optional(), amount: amount.optional(), withdrawalDate: businessDate('La date du retrait').optional(), reason: reason.optional() })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'Aucune modification à enregistrer.', path: ['body'] })

export const deleteWithdrawalSchema = z
  .object({ reason: z.string({ message: 'Le motif est invalide.' }).trim().max(300, 'Le motif de suppression est limité à 300 caractères.').nullish().transform((value) => (value ? value : null)) })
  .strict()

const intParam = (label, { min, max, fallback }) =>
  z.string().regex(/^\d{1,6}$/, `${label} est invalide.`).transform(Number).refine((value) => value >= min && value <= max, `${label} est invalide.`).optional().transform((value) => value ?? fallback)

export const listWithdrawalsQuerySchema = z
  .object({
    search: z.string().trim().max(100, 'La recherche est limitée à 100 caractères.').optional(),
    beneficiaryId: z.string().regex(OBJECT_ID, 'Le bénéficiaire est invalide.').optional(),
    authorId: z.string().regex(OBJECT_ID, "L'auteur est invalide.").optional(),
    from: businessDate('La date de début').optional(),
    to: businessDate('La date de fin').optional(),
    sort: z.enum(WITHDRAWAL_SORTS, { message: `Le tri doit valoir : ${WITHDRAWAL_SORTS.join(', ')}.` }).optional().default('date_desc'),
    page: intParam('La page', { min: 1, max: 100000, fallback: 1 }),
    pageSize: intParam('La taille de page', { min: 1, max: 100, fallback: 20 }),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.from && value.to && value.to < value.from) ctx.addIssue({ code: 'custom', path: ['to'], message: 'La date de fin ne peut pas précéder la date de début.' })
  })
