import mongoose from 'mongoose'
import { businessDateField, fcfaAmountField, periodField, userRefField } from './shared/fields.js'
import { forbidPhysicalDeletePlugin, softDeletePlugin, toJSONPlugin } from './shared/plugins.js'

const { Schema } = mongoose

/**
 * Cotisation d'un associé.
 * - Plusieurs cotisations par associé et par mois sont permises ; aucun plafond individuel.
 * - `contributionDate` = date réelle du versement ; `period` = mois concerné (peut différer : paiement en retard).
 * - `partner` (qui cotise) peut différer de `recordedBy` (qui enregistre).
 * - Suppression logique uniquement (voir plugins).
 */
const contributionSchema = new Schema(
  {
    partner: userRefField({ label: "L'associé concerné" }),
    amount: fcfaAmountField(),
    contributionDate: businessDateField({ required: true, label: 'La date de contribution' }),
    period: periodField(),
    note: { type: String, trim: true, maxlength: [300, 'La note est limitée à 300 caractères.'], default: null },
    recordedBy: userRefField({ label: "L'auteur de l'enregistrement", immutable: true }),
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
)

contributionSchema.index({ partner: 1, period: 1, deletedAt: 1 }, { name: 'contribution_partner_period' })
contributionSchema.index({ deletedAt: 1, contributionDate: -1 }, { name: 'contribution_active_by_date' })
contributionSchema.index({ recordedBy: 1, createdAt: -1 }, { name: 'contribution_recorded_by' })

contributionSchema.plugin(softDeletePlugin)
contributionSchema.plugin(forbidPhysicalDeletePlugin)
contributionSchema.plugin(toJSONPlugin)

export const Contribution = mongoose.models.Contribution ?? mongoose.model('Contribution', contributionSchema)
export { contributionSchema }
