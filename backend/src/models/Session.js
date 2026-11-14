import mongoose from 'mongoose'
import { SESSION_REVOCATION_REASONS, SESSION_RETENTION_AFTER_EXPIRY_SECONDS } from './shared/constants.js'
import { userRefField } from './shared/fields.js'
import { toJSONPlugin } from './shared/plugins.js'
import { isSha256Hex } from './shared/validators.js'

const { Schema } = mongoose

/**
 * Session d'un associé = un refresh token émis. À chaque rotation, l'ancienne session est révoquée
 * (`ROTATED`, `replacedBy`) et une nouvelle est créée dans la même famille (`familyId`) : si un jeton déjà
 * tourné est présenté à nouveau, toute la famille est révoquée (`REUSE_DETECTED`).
 * Le jeton en clair n'est JAMAIS stocké : seulement son empreinte SHA-256.
 * Expiration automatique : MongoDB supprime la session 7 jours après `expiresAt` (index TTL, délai d'environ 1 minute).
 */
const sessionSchema = new Schema(
  {
    user: userRefField({ label: "L'utilisateur", immutable: true }),
    familyId: {
      type: String,
      required: [true, "L'identifiant de famille est obligatoire."],
      immutable: true,
      validate: { validator: (value) => /^[A-Za-z0-9-]{16,64}$/.test(value), message: "L'identifiant de famille est invalide." },
    },
    refreshTokenHash: {
      type: String,
      required: [true, "L'empreinte du refresh token est obligatoire."],
      immutable: true,
      select: false,
      validate: { validator: isSha256Hex, message: "L'empreinte du refresh token doit être un SHA-256 hexadécimal." },
    },
    expiresAt: {
      type: Date,
      required: [true, "La date d'expiration est obligatoire."],
      immutable: true,
      validate: {
        validator(value) {
          return !this.isNew || value.getTime() > Date.now()
        },
        message: "La date d'expiration doit être dans le futur.",
      },
    },
    revokedAt: { type: Date, default: null },
    revokedReason: {
      type: String,
      enum: { values: SESSION_REVOCATION_REASONS, message: 'Le motif de révocation est invalide.' },
      default: null,
    },
    replacedBy: { type: Schema.Types.ObjectId, ref: 'Session', default: null },
    lastUsedAt: { type: Date, default: null },
    userAgent: { type: String, trim: true, maxlength: [300, 'Le user-agent est limité à 300 caractères.'], default: null },
    ipAddress: { type: String, trim: true, maxlength: [64, "L'adresse IP est limitée à 64 caractères."], default: null },
  },
  { timestamps: true, strict: 'throw' },
)

sessionSchema.pre('validate', function checkRevocationConsistency() {
  if ((this.revokedAt == null) !== (this.revokedReason == null)) {
    this.invalidate('revokedReason', 'Une révocation exige à la fois une date et un motif.')
  }
})

sessionSchema.index({ refreshTokenHash: 1 }, { unique: true, name: 'uniq_session_refresh_token_hash' })
sessionSchema.index({ user: 1, revokedAt: 1, expiresAt: 1 }, { name: 'session_user_active' })
sessionSchema.index({ familyId: 1 }, { name: 'session_family' })
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: SESSION_RETENTION_AFTER_EXPIRY_SECONDS, name: 'ttl_session_expires_at' })

sessionSchema.plugin(toJSONPlugin)

export const Session = mongoose.models.Session ?? mongoose.model('Session', sessionSchema)
export { sessionSchema }
