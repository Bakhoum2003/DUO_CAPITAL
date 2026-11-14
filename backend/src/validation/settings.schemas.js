import { z } from 'zod'
import { AMOUNT_SEPARATORS, FUND_DESCRIPTION_MAX_LENGTH, FUND_DESCRIPTION_MIN_LENGTH, FUND_PROJECT_INFO_MAX_LENGTH, THEMES } from '../models/shared/constants.js'

/** Même nettoyage que le formulaire : espaces de bord retirés, espaces multiples réduits, retours à la ligne conservés. */
export function normalizeText(value) {
  return value
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim()
}

const description = z
  .string({ message: 'La description du fonds doit être un texte.' })
  .transform(normalizeText)
  .pipe(
    z
      .string()
      .min(1, 'La description du fonds est obligatoire.')
      .min(FUND_DESCRIPTION_MIN_LENGTH, `La description doit contenir au moins ${FUND_DESCRIPTION_MIN_LENGTH} caractères.`)
      .max(FUND_DESCRIPTION_MAX_LENGTH, `La description ne peut pas dépasser ${FUND_DESCRIPTION_MAX_LENGTH} caractères.`),
  )

const projectInfo = z
  .string({ message: 'Les informations du projet doivent être un texte.' })
  .transform(normalizeText)
  .pipe(z.string().max(FUND_PROJECT_INFO_MAX_LENGTH, `Les informations du projet ne peuvent pas dépasser ${FUND_PROJECT_INFO_MAX_LENGTH} caractères.`))

/**
 * PUT /settings : seuls la description et les informations du projet sont modifiables. Nom, slogan, devise, objectifs et associés ne le sont jamais :
 * tout autre champ est refusé (`.strict()`). `expectedVersion` (version lue par le client) est obligatoire : c'est le contrôle de concurrence.
 */
export const updateSettingsSchema = z
  .object({
    expectedVersion: z
      .number({ message: 'La version attendue doit être un nombre entier.' })
      .int('La version attendue doit être un nombre entier.')
      .min(0, 'La version attendue est invalide.')
      .max(Number.MAX_SAFE_INTEGER, 'La version attendue est invalide.'),
    description: description.optional(),
    projectInfo: projectInfo.optional(),
  })
  .strict()
  .refine((body) => body.description !== undefined || body.projectInfo !== undefined, { message: 'Indiquez la description ou les informations du projet à modifier.', path: ['description'] })

/**
 * PUT /settings/preferences : modification PARTIELLE de ses propres préférences. Aucun identifiant d'utilisateur n'est accepté
 * (le propriétaire vient de la session) ; aucune préférence d'email n'existe.
 */
export const updatePreferencesSchema = z
  .object({
    theme: z.enum(THEMES, { message: 'Le thème doit valoir « light » ou « dark ».' }).optional(),
    amountSeparator: z.enum(AMOUNT_SEPARATORS, { message: `Le format des montants doit valoir : ${AMOUNT_SEPARATORS.join(', ')}.` }).optional(),
    visualNotificationsEnabled: z.boolean({ message: 'Les notifications visuelles doivent valoir true ou false.' }).optional(),
    contributionRemindersEnabled: z.boolean({ message: 'Les rappels de cotisation doivent valoir true ou false.' }).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Indiquez au moins une préférence à modifier.', path: ['theme'] })

/** POST /settings/preferences/reset : aucun champ attendu. */
export const emptyBodySchema = z.object({}).strict()
