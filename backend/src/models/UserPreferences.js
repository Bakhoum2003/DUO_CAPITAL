import mongoose from 'mongoose'
import { AMOUNT_SEPARATORS, DEFAULT_USER_PREFERENCES, THEMES } from './shared/constants.js'
import { userRefField } from './shared/fields.js'
import { forbidPhysicalDeletePlugin, toJSONPlugin } from './shared/plugins.js'

const { Schema } = mongoose

/**
 * Préférences PERSONNELLES d'un associé : un document par utilisateur (index unique sur `user`), indépendant de celui de l'autre associé.
 * Le propriétaire est TOUJOURS l'utilisateur de la session authentifiée (jamais une valeur envoyée par le client).
 * Le document n'est créé qu'à la première modification explicite ; sans document, l'API renvoie les valeurs par défaut.
 * Il n'existe volontairement aucun champ « notifications par email » : cette fonctionnalité n'est pas disponible.
 * Un document ne se supprime jamais : « réinitialiser » réécrit les valeurs par défaut.
 */
const userPreferencesSchema = new Schema(
  {
    user: userRefField({ label: "L'utilisateur" }),
    theme: {
      type: String,
      enum: { values: THEMES, message: 'Le thème doit valoir « light » ou « dark ».' },
      default: DEFAULT_USER_PREFERENCES.theme,
    },
    amountSeparator: {
      type: String,
      enum: { values: AMOUNT_SEPARATORS, message: `Le format des montants doit valoir : ${AMOUNT_SEPARATORS.join(', ')}.` },
      default: DEFAULT_USER_PREFERENCES.amountSeparator,
    },
    visualNotificationsEnabled: { type: Boolean, default: DEFAULT_USER_PREFERENCES.visualNotificationsEnabled },
    contributionRemindersEnabled: { type: Boolean, default: DEFAULT_USER_PREFERENCES.contributionRemindersEnabled },
  },
  { timestamps: true, strict: 'throw' },
)

userPreferencesSchema.index({ user: 1 }, { unique: true, name: 'uniq_user_preferences_user' })

userPreferencesSchema.plugin(forbidPhysicalDeletePlugin, {
  code: 'PREFERENCES_DELETE_FORBIDDEN',
  message: 'Les préférences ne se suppriment pas : utilisez la réinitialisation.',
})
userPreferencesSchema.plugin(toJSONPlugin)

export const UserPreferences = mongoose.models.UserPreferences ?? mongoose.model('UserPreferences', userPreferencesSchema)
export { userPreferencesSchema }
