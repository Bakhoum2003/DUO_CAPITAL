// l'application n'a pas le droit `remove` sur les collections financières ni `update`/`remove` sur auditlogs.

import mongoose from 'mongoose'
import { AppError } from '../../utils/AppError.js'

const { Schema } = mongoose

function refusal(code, message) {
  return function refuse() {
    throw new AppError({ status: 409, code, message })
  }
}

/** Active `id` (chaîne), retire `_id`/`__v` et tout champ secret de la sortie JSON. */
export function toJSONPlugin(schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
      ret.id = String(ret._id)
      delete ret._id
      delete ret.passwordHash
      delete ret.refreshTokenHash
      return ret
    },
  })
}

/**
 * Suppression logique : champs deletedAt / deletedBy / deletionReason, indicateur `isDeleted`,
 * filtre `.active()` et méthode `markDeleted()` (modifie le document, sans l'enregistrer).
 * Cohérence : deletedAt et deletedBy vont toujours ensemble.
 */
export function softDeletePlugin(schema) {
  schema.add({
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletionReason: { type: String, trim: true, maxlength: [300, 'Le motif de suppression est limité à 300 caractères.'], default: null },
  })

  schema.virtual('isDeleted').get(function isDeleted() {
    return this.deletedAt != null
  })

  schema.query.active = function active() {
    return this.where({ deletedAt: null })
  }

  schema.methods.markDeleted = function markDeleted({ by, reason = null, at = new Date() }) {
    this.deletedAt = at
    this.deletedBy = by
    this.deletionReason = reason
    return this
  }

  schema.pre('validate', function checkSoftDeleteConsistency() {
    if ((this.deletedAt == null) !== (this.deletedBy == null)) {
      this.invalidate('deletedBy', 'Une suppression logique exige à la fois une date et son auteur.')
    }
  })
}

/** Interdit toute suppression physique via Mongoose (documents et requêtes). */
export function forbidPhysicalDeletePlugin(schema, { code = 'PHYSICAL_DELETE_FORBIDDEN', message = 'La suppression définitive est interdite : utilisez la suppression logique.' } = {}) {
  const refuse = refusal(code, message)
  schema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete'], { document: false, query: true }, refuse)
  schema.pre('deleteOne', { document: true, query: false }, refuse)
}

/** Rend les documents non modifiables et non supprimables après leur création (journal d'audit). */
export function immutableDocumentsPlugin(schema, { code = 'IMMUTABLE_RECORD', message = 'Cet enregistrement est immuable : il ne peut être ni modifié ni supprimé.' } = {}) {
  const refuse = refusal(code, message)

  schema.pre(
    ['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete'],
    { document: false, query: true },
    refuse,
  )
  schema.pre(['updateOne', 'deleteOne'], { document: true, query: false }, refuse)
  schema.pre('save', function refuseUpdate() {
    if (!this.isNew) refuse()
  })
}
