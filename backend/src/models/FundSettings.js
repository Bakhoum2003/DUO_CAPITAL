import mongoose from 'mongoose'
import { FUND_DESCRIPTION_MAX_LENGTH, FUND_DESCRIPTION_MIN_LENGTH, FUND_PROJECT_INFO_MAX_LENGTH, FUND_SETTINGS_ID } from './shared/constants.js'
import { userRefField } from './shared/fields.js'
import { forbidPhysicalDeletePlugin, toJSONPlugin } from './shared/plugins.js'

const { Schema } = mongoose

/**
 * Paramètres COMMUNS du fonds : UN seul document (`_id` fixe), partagé par les deux associés (mêmes droits en lecture et en écriture).
 * Seuls la description et les informations du projet sont modifiables : le nom, le slogan et la devise restent des constantes.
 *
 * `version` est le compteur de concurrence : 1 à la première écriture, +1 à chaque modification. Tant que le document n'existe pas,
 * l'API renvoie les valeurs par défaut avec la version 0 SANS rien écrire. Une écriture n'aboutit que si la version attendue par le client est
 * la version courante (sinon HTTP 409), ce qui évite qu'un associé écrase en silence la modification de l'autre.
 * Le document ne se supprime jamais (suppression physique refusée).
 */
const fundSettingsSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId(FUND_SETTINGS_ID), immutable: true },
    description: {
      type: String,
      required: [true, 'La description du fonds est obligatoire.'],
      trim: true,
      minlength: [FUND_DESCRIPTION_MIN_LENGTH, `La description doit contenir au moins ${FUND_DESCRIPTION_MIN_LENGTH} caractères.`],
      maxlength: [FUND_DESCRIPTION_MAX_LENGTH, `La description ne peut pas dépasser ${FUND_DESCRIPTION_MAX_LENGTH} caractères.`],
    },
    projectInfo: {
      type: String,
      trim: true,
      default: '',
      maxlength: [FUND_PROJECT_INFO_MAX_LENGTH, `Les informations du projet ne peuvent pas dépasser ${FUND_PROJECT_INFO_MAX_LENGTH} caractères.`],
    },
    version: {
      type: Number,
      required: true,
      default: 1,
      min: [1, 'La version doit être supérieure ou égale à 1.'],
      validate: { validator: Number.isInteger, message: 'La version doit être un entier.' },
    },
    updatedBy: userRefField({ label: "L'auteur de la modification" }),
  },
  { timestamps: true, strict: 'throw' },
)

fundSettingsSchema.plugin(forbidPhysicalDeletePlugin, {
  code: 'SETTINGS_DELETE_FORBIDDEN',
  message: 'Les paramètres communs ne se suppriment pas : modifiez-les.',
})
fundSettingsSchema.plugin(toJSONPlugin)

export const FundSettings = mongoose.models.FundSettings ?? mongoose.model('FundSettings', fundSettingsSchema)
export { fundSettingsSchema }
