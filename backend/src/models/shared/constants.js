// Constantes des modèles MongoDB (valeurs stockées en base : ne pas renommer sans migration).

export const USER_STATUSES = Object.freeze(['ACTIVE', 'DISABLED'])
export const PARTNER_NUMBERS = Object.freeze([1, 2]) // deux associés, pas un de plus

// SUSPENDED (Phase E) est ajouté en fin de liste : les documents existants (ACTIVE, COMPLETED, ARCHIVED) restent valides.
export const BUSINESS_STATUSES = Object.freeze(['ACTIVE', 'COMPLETED', 'ARCHIVED', 'SUSPENDED'])
export const BUSINESS_OPERATION_TYPES = Object.freeze(['INVESTMENT', 'EXPENSE', 'REVENUE'])

export const SESSION_REVOCATION_REASONS = Object.freeze([
  'LOGOUT',
  'ROTATED',
  'REUSE_DETECTED',
  'PASSWORD_CHANGED',
  'ACCOUNT_DISABLED',
  'MANUAL',
])

export const AUDIT_ACTOR_TYPES = Object.freeze(['USER', 'SYSTEM'])
export const AUDIT_RESOURCE_TYPES = Object.freeze([
  'USER',
  'SESSION',
  'CONTRIBUTION',
  'BUSINESS',
  'BUSINESS_OPERATION',
  'WITHDRAWAL',
  'SETTINGS', // Phase Paramètres : modification des paramètres communs du fonds
])

// Paramètres (Phase Paramètres).
export const THEMES = Object.freeze(['light', 'dark'])
export const AMOUNT_SEPARATORS = Object.freeze(['space', 'dot', 'none']) // espace insécable, point, aucun (mêmes clés que le frontend)
export const DEFAULT_USER_PREFERENCES = Object.freeze({
  theme: 'light',
  amountSeparator: 'space',
  visualNotificationsEnabled: true,
  contributionRemindersEnabled: true,
})
export const FUND_SETTINGS_ID = '66756e642d73657474696e67' // identifiant fixe du document unique des paramètres communs (« fund-setting » en hexadécimal)
export const FUND_DESCRIPTION_MIN_LENGTH = 10
export const FUND_DESCRIPTION_MAX_LENGTH = 300
export const FUND_PROJECT_INFO_MAX_LENGTH = 500
// Valeurs actuelles de l'application (identiques à celles du frontend) : renvoyées tant qu'aucune modification n'a été enregistrée.
export const DEFAULT_FUND_SETTINGS = Object.freeze({
  description: "Fonds d'investissement commun de deux associés, Mohamed Bakhoum et Cheikh Sow : cotisations mensuelles, activités commerciales et suivi des résultats.",
  projectInfo: 'Objectif : faire fructifier le capital en finançant ensemble de petites activités commerciales.',
})
// Identité officielle : jamais modifiable.
export const APP_IDENTITY = Object.freeze({ name: 'DUO CAPITAL', slogan: 'Ensemble, plus loin !', currencyLabel: 'FCFA (XOF)' })

export const IDEMPOTENCY_STATUSES = Object.freeze(['PROCESSING', 'COMPLETED', 'FAILED'])

// Limites techniques.
export const MAX_FCFA_AMOUNT = Number.MAX_SAFE_INTEGER
export const MIN_BUSINESS_YEAR = 2000
export const MAX_BUSINESS_YEAR = 2100
export const MAX_AUDIT_PAYLOAD_BYTES = 20 * 1024
export const MAX_IDEMPOTENT_RESPONSE_BYTES = 64 * 1024
export const MAX_REOPEN_HISTORY_ENTRIES = 50

// Durées de conservation.
export const SESSION_RETENTION_AFTER_EXPIRY_SECONDS = 7 * 24 * 60 * 60 // conservée 7 jours après expiration (diagnostic)
export const IDEMPOTENCY_KEY_TTL_MS = 24 * 60 * 60 * 1000 // 24 h
