import mongoose from 'mongoose'
import { AUDIT_ACTOR_TYPES, AUDIT_RESOURCE_TYPES, MAX_AUDIT_PAYLOAD_BYTES } from './shared/constants.js'
import { immutableDocumentsPlugin, toJSONPlugin } from './shared/plugins.js'
import { findSensitiveKey, isPlainObject, jsonByteSize } from './shared/validators.js'

const { Schema } = mongoose

const payloadValidators = [
  {
    validator: (value) => value == null || isPlainObject(value) || Array.isArray(value),
    message: 'Les informations avant/après doivent être un objet.',
  },
  {
    validator: (value) => findSensitiveKey(value) === null,
    message: 'Les informations avant/après ne doivent contenir aucun secret (mot de passe, jeton, cookie…).',
  },
  {
    validator: (value) => jsonByteSize(value) <= MAX_AUDIT_PAYLOAD_BYTES,
    message: `Les informations avant/après sont limitées à ${MAX_AUDIT_PAYLOAD_BYTES / 1024} Ko.`,
  },
]

/** Tous les champs sont immuables : une écriture est un fait, jamais corrigé. */
function immutable(definitions) {
  return Object.fromEntries(Object.entries(definitions).map(([path, definition]) => [path, { ...definition, immutable: true }]))
}

/**
 * Journal d'audit : ajout seulement. Les opérations ordinaires (save sur un document existant, update, delete,
 * replace) sont refusées par le plugin d'immuabilité. `occurredAt` est en UTC. Les payloads `before`/`after`
 * ne doivent contenir aucun secret ; le service d'audit (B-suivantes) n'y met que les champs utiles.
 * Voir la limite des plugins (plugins.js) : en production, retirer les droits update/remove sur cette collection.
 */
const auditLogSchema = new Schema(
  immutable({
    actorType: { type: String, enum: { values: AUDIT_ACTOR_TYPES, message: "Le type d'acteur est invalide." }, default: 'USER' },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      validate: {
        validator(value) {
          return this.actorType === 'SYSTEM' || value != null
        },
        message: "L'acteur est obligatoire pour une action d'utilisateur.",
      },
    },
    actorName: { type: String, trim: true, maxlength: 80, default: null }, // nom au moment de l'action
    action: {
      type: String,
      required: [true, "L'action est obligatoire."],
      validate: { validator: (value) => /^[A-Z][A-Z0-9_]{2,59}$/.test(value), message: "L'action doit être en MAJUSCULES_AVEC_TIRETS_BAS (ex. CONTRIBUTION_CREATED)." },
    },
    resourceType: {
      type: String,
      required: [true, 'Le type de ressource est obligatoire.'],
      enum: { values: AUDIT_RESOURCE_TYPES, message: 'Le type de ressource est invalide.' },
    },
    resourceId: { type: Schema.Types.ObjectId, required: [true, "L'identifiant de la ressource est obligatoire."] },
    occurredAt: { type: Date, required: true, default: () => new Date() },
    before: { type: Schema.Types.Mixed, default: null, validate: payloadValidators },
    after: { type: Schema.Types.Mixed, default: null, validate: payloadValidators },
    requestId: { type: String, trim: true, maxlength: 64, default: null },
    ipAddress: { type: String, trim: true, maxlength: 64, default: null },
  }),
  { timestamps: false, strict: 'throw' },
)

auditLogSchema.index({ resourceType: 1, resourceId: 1, occurredAt: -1 }, { name: 'audit_resource' })
auditLogSchema.index({ actor: 1, occurredAt: -1 }, { name: 'audit_actor' })
auditLogSchema.index({ action: 1, occurredAt: -1 }, { name: 'audit_action' })
auditLogSchema.index({ occurredAt: -1 }, { name: 'audit_recent' })

auditLogSchema.plugin(immutableDocumentsPlugin)
auditLogSchema.plugin(toJSONPlugin)

export const AuditLog = mongoose.models.AuditLog ?? mongoose.model('AuditLog', auditLogSchema)
export { auditLogSchema }
