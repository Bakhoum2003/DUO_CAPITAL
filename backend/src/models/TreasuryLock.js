import mongoose from 'mongoose'

const { Schema } = mongoose

export const TREASURY_LOCK_ID = 'FUND'

/**
 * Verrou unique de la trésorerie commune (UN seul document, `_id` fixe). Il ne contient AUCUN montant.
 *
 * POURQUOI : une transaction MongoDB isole chaque lecture (instantané), mais deux transactions qui lisent le même solde puis
 * écrivent dans des documents DIFFÉRENTS (deux retraits) ne se gênent pas : elles pourraient dépenser deux fois le même argent.
 * Toute sortie d'argent commence donc par incrémenter ce document dans sa transaction : deux sorties simultanées écrivent
 * le même document, MongoDB en refuse une (conflit d'écriture), qui est rejouée sur le solde déjà mis à jour.
 * Les sorties sont ainsi sérialisées sans double comptabilisation. Voir services/treasury/outflowGuard.js.
 */
const treasuryLockSchema = new Schema(
  {
    _id: { type: String, default: TREASURY_LOCK_ID, immutable: true },
    version: { type: Number, default: 0, min: 0 },
    lastOutflowAt: { type: Date, default: null },
  },
  { strict: 'throw', timestamps: true },
)

export const TreasuryLock = mongoose.models.TreasuryLock ?? mongoose.model('TreasuryLock', treasuryLockSchema)
export { treasuryLockSchema }
