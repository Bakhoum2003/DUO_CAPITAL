import mongoose from 'mongoose'
import { BUSINESS_OPERATION_TYPES } from './shared/constants.js'
import { businessDateField, fcfaAmountField, userRefField } from './shared/fields.js'
import { forbidPhysicalDeletePlugin, softDeletePlugin, toJSONPlugin } from './shared/plugins.js'
import { isHttpUrl } from './shared/validators.js'

const { Schema } = mongoose

const receiptSchema = new Schema(
  {
    reference: { type: String, trim: true, maxlength: [120, 'La référence du justificatif est limitée à 120 caractères.'], default: null },
    url: {
      type: String,
      trim: true,
      default: null,
      validate: { validator: (value) => value == null || isHttpUrl(value), message: "L'adresse du justificatif doit être une URL http(s) valide." },
    },
  },
  { _id: false },
)

/**
 * Mouvement d'argent d'une activité : INVESTMENT, EXPENSE ou REVENUE (jamais un résultat calculé).
 * - `recordedBy` (auteur) peut différer de `concernedPartner` (qui a payé / encaissé, lorsque c'est pertinent).
 * - L'investissement initial d'une activité est une opération INVESTMENT comme les autres.
 * - Suppression logique uniquement.
 *
 * RÈGLES IMPOSÉES PAR LES SERVICES (elles exigent de lire d'autres documents) :
 * - refuser l'ajout, la modification ou la suppression d'une opération si l'activité est COMPLETED ou ARCHIVED ;
 * - refuser un REVENUE/EXPENSE qui rendrait la trésorerie négative ;
 * - vérifier que `business` existe.
 */
const businessOperationSchema = new Schema(
  {
    business: { type: Schema.Types.ObjectId, ref: 'Business', required: [true, "L'activité est obligatoire."], immutable: true },
    type: {
      type: String,
      required: [true, "Le type d'opération est obligatoire."],
      enum: { values: BUSINESS_OPERATION_TYPES, message: "Le type d'opération est invalide." },
      immutable: true, // changer le type revient à corriger un mouvement : on supprime logiquement puis on recrée
    },
    amount: fcfaAmountField(),
    operationDate: businessDateField({ required: true, label: "La date de l'opération" }),
    description: { type: String, trim: true, maxlength: [500, 'La description est limitée à 500 caractères.'], default: '' },
    receipt: { type: receiptSchema, default: null },
    concernedPartner: userRefField({ required: false }),
    recordedBy: userRefField({ label: "L'auteur de l'enregistrement", immutable: true }),
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
)

businessOperationSchema.index({ business: 1, deletedAt: 1, operationDate: -1 }, { name: 'operation_business_date' })
businessOperationSchema.index({ business: 1, type: 1, deletedAt: 1 }, { name: 'operation_business_type' })
businessOperationSchema.index({ concernedPartner: 1, operationDate: -1 }, { name: 'operation_partner_date' })
businessOperationSchema.index({ deletedAt: 1, operationDate: -1 }, { name: 'operation_active_by_date' })

businessOperationSchema.plugin(softDeletePlugin)
businessOperationSchema.plugin(forbidPhysicalDeletePlugin)
businessOperationSchema.plugin(toJSONPlugin)

export const BusinessOperation = mongoose.models.BusinessOperation ?? mongoose.model('BusinessOperation', businessOperationSchema)
export { businessOperationSchema }
