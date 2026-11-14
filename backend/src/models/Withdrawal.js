import mongoose from 'mongoose'
import { businessDateField, fcfaAmountField, userRefField } from './shared/fields.js'
import { forbidPhysicalDeletePlugin, softDeletePlugin, toJSONPlugin } from './shared/plugins.js'

const { Schema } = mongoose

/**
 * Retrait d'un associé (sortie d'argent de la trésorerie commune).
 * RÈGLE NON GARANTIE PAR LE SCHÉMA : « un retrait ne rend jamais la trésorerie négative » dépend de toutes les
 * autres collections. Elle sera imposée par le service de retrait, dans une transaction MongoDB.
 */
const withdrawalSchema = new Schema(
  {
    beneficiary: userRefField({ label: "L'associé bénéficiaire" }),
    amount: fcfaAmountField(),
    withdrawalDate: businessDateField({ required: true, label: 'La date du retrait' }),
    reason: { type: String, trim: true, maxlength: [300, 'Le motif est limité à 300 caractères.'], default: null },
    recordedBy: userRefField({ label: "L'auteur de l'enregistrement", immutable: true }),
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
)

withdrawalSchema.index({ beneficiary: 1, withdrawalDate: -1 }, { name: 'withdrawal_beneficiary_date' })
withdrawalSchema.index({ deletedAt: 1, withdrawalDate: -1 }, { name: 'withdrawal_active_by_date' })

withdrawalSchema.plugin(softDeletePlugin)
withdrawalSchema.plugin(forbidPhysicalDeletePlugin)
withdrawalSchema.plugin(toJSONPlugin)

export const Withdrawal = mongoose.models.Withdrawal ?? mongoose.model('Withdrawal', withdrawalSchema)
export { withdrawalSchema }
