import mongoose from 'mongoose'
import { BUSINESS_STATUSES, MAX_REOPEN_HISTORY_ENTRIES } from './shared/constants.js'
import { businessDateField, userRefField } from './shared/fields.js'
import { forbidPhysicalDeletePlugin, toJSONPlugin } from './shared/plugins.js'
import { toNameKey } from './shared/validators.js'

const { Schema } = mongoose

// Trace d'une réouverture (en plus de l'entrée AuditLog écrite par le service).
const reopenEntrySchema = new Schema(
  {
    reopenedAt: { type: Date, required: true },
    reopenedBy: userRefField({ label: "L'auteur de la réouverture" }),
    reason: { type: String, required: [true, 'Le motif de réouverture est obligatoire.'], trim: true, maxlength: 300 },
    previousEndDate: businessDateField({ label: "L'ancienne date de fin" }),
  },
  { _id: false },
)

/**
 * Activité (business). Elle ne se supprime jamais physiquement : on la passe en ARCHIVED.
 * L'investissement initial n'est PAS un champ ici : c'est une vraie BusinessOperation de type INVESTMENT.
 *
 * Règles imposées par les services (elles exigent d'autres collections ou des transitions) :
 * - transitions de statut (voir services/activities/rules.js) : ACTIVE ⇄ SUSPENDED ; ACTIVE/SUSPENDED → COMPLETED → ACTIVE (réouverture avec motif) ;
 *   ACTIVE/SUSPENDED/COMPLETED → ARCHIVED ;
 * - renseigner completedAt/completedBy à la clôture, vider endDate/completedAt/completedBy à la réouverture
 *   et ajouter une entrée à `reopenHistory` (+ AuditLog) ;
 * - refuser toute nouvelle opération sur une activité COMPLETED ;
 * - détection des doublons de nom (`nameKey` est indexé mais non unique).
 */
const businessSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Le nom de l'activité est obligatoire."],
      trim: true,
      minlength: [2, "Le nom de l'activité doit contenir au moins 2 caractères."],
      maxlength: [100, "Le nom de l'activité est limité à 100 caractères."],
    },
    nameKey: { type: String, default: '' }, // calculé : nom sans accents ni casse (recherche, détection de doublons)
    description: { type: String, trim: true, maxlength: [1000, 'La description est limitée à 1000 caractères.'], default: '' },
    category: { type: String, trim: true, maxlength: [60, 'La catégorie est limitée à 60 caractères.'], default: null },
    status: {
      type: String,
      enum: { values: BUSINESS_STATUSES, message: "Le statut de l'activité est invalide." },
      default: 'ACTIVE',
    },
    startDate: businessDateField({ required: true, label: 'La date de début' }),
    endDate: businessDateField({ label: 'La date de fin' }),
    completedAt: { type: Date, default: null },
    completedBy: userRefField({ required: false }),
    archivedAt: { type: Date, default: null },
    archivedBy: userRefField({ required: false }),
    reopenHistory: {
      type: [reopenEntrySchema],
      default: [],
      validate: { validator: (entries) => entries.length <= MAX_REOPEN_HISTORY_ENTRIES, message: 'Trop de réouvertures enregistrées.' },
    },
    createdBy: userRefField({ label: "L'auteur de la création", immutable: true }),
  },
  { timestamps: true, strict: 'throw', optimisticConcurrency: true },
)

businessSchema.pre('validate', function checkBusinessConsistency() {
  this.nameKey = toNameKey(this.name)

  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'La date de fin ne peut pas précéder la date de début.')
  }
  if (this.status === 'COMPLETED' && !this.endDate) {
    this.invalidate('endDate', 'Une activité terminée doit avoir une date de fin.')
  }
})

businessSchema.index({ status: 1, startDate: -1 }, { name: 'business_status_start' })
businessSchema.index({ nameKey: 1 }, { name: 'business_name_key' })
businessSchema.index({ createdBy: 1, createdAt: -1 }, { name: 'business_created_by' })

businessSchema.plugin(forbidPhysicalDeletePlugin, {
  code: 'BUSINESS_DELETE_FORBIDDEN',
  message: "Une activité ne se supprime pas : archivez-la (statut ARCHIVED). Ses opérations doivent rester traçables.",
})
businessSchema.plugin(toJSONPlugin)

export const Business = mongoose.models.Business ?? mongoose.model('Business', businessSchema)
export { businessSchema }
