import mongoose from 'mongoose'
import { IDEMPOTENCY_KEY_TTL_MS, IDEMPOTENCY_STATUSES, MAX_IDEMPOTENT_RESPONSE_BYTES } from './shared/constants.js'
import { userRefField } from './shared/fields.js'
import { toJSONPlugin } from './shared/plugins.js'
import { isSha256Hex, jsonByteSize } from './shared/validators.js'

const { Schema } = mongoose

/**
 * Clé d'idempotence : évite qu'un même envoi (double clic, nouvelle tentative réseau) crée deux enregistrements.
 * Unicité : (acteur, clé) — un autre associé qui utiliserait la même valeur n'entre pas en collision.
 * Cycle : PROCESSING (réservée) → COMPLETED (réponse enregistrée, rejouée telle quelle) ou FAILED.
 * Si la même clé revient avec une `requestHash` différente, le service répond 422 (clé réutilisée pour une autre requête).
 * Expiration automatique (index TTL) : 24 h par défaut. La réservation et l'écriture métier se font dans la
 * même transaction MongoDB (service à venir).
 */
const idempotencyKeySchema = new Schema(
  {
    key: {
      type: String,
      required: [true, "La clé d'idempotence est obligatoire."],
      trim: true,
      immutable: true,
      validate: { validator: (value) => /^[A-Za-z0-9_\-:.]{8,128}$/.test(value), message: "La clé d'idempotence doit contenir 8 à 128 caractères (lettres, chiffres, _ - : .)." },
    },
    actor: userRefField({ label: "L'acteur", immutable: true }),
    endpoint: {
      type: String,
      required: [true, "L'opération est obligatoire."],
      trim: true,
      immutable: true,
      validate: { validator: (value) => /^[A-Z]{3,7} \/[\x21-\x7E]{0,200}$/.test(value), message: "L'opération doit ressembler à « POST /api/v1/contributions »." },
    },
    requestHash: {
      type: String,
      required: [true, "L'empreinte de la requête est obligatoire."],
      immutable: true,
      validate: { validator: isSha256Hex, message: "L'empreinte de la requête doit être un SHA-256 hexadécimal." },
    },
    status: { type: String, enum: { values: IDEMPOTENCY_STATUSES, message: "L'état de traitement est invalide." }, default: 'PROCESSING' },
    response: {
      type: new Schema(
        {
          statusCode: { type: Number, min: 100, max: 599, validate: { validator: Number.isInteger, message: 'Le code HTTP doit être un entier.' } },
          body: {
            type: Schema.Types.Mixed,
            default: null,
            validate: { validator: (value) => jsonByteSize(value) <= MAX_IDEMPOTENT_RESPONSE_BYTES, message: 'La réponse enregistrée est trop volumineuse.' },
          },
        },
        { _id: false },
      ),
      default: null,
    },
    resourceType: { type: String, trim: true, maxlength: 40, default: null },
    resourceId: { type: Schema.Types.ObjectId, default: null },
    completedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + IDEMPOTENCY_KEY_TTL_MS) },
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
)

idempotencyKeySchema.pre('validate', function checkCompletion() {
  if (this.status === 'COMPLETED') {
    if (!this.response || this.response.statusCode == null) this.invalidate('response', 'Une requête terminée doit avoir sa réponse enregistrée.')
    if (!this.completedAt) this.invalidate('completedAt', 'Une requête terminée doit avoir une date de fin.')
  }
})

idempotencyKeySchema.index({ actor: 1, key: 1 }, { unique: true, name: 'uniq_idempotency_actor_key' })
idempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ttl_idempotency_expires_at' })

idempotencyKeySchema.plugin(toJSONPlugin)

export const IdempotencyKey = mongoose.models.IdempotencyKey ?? mongoose.model('IdempotencyKey', idempotencyKeySchema)
export { idempotencyKeySchema }
