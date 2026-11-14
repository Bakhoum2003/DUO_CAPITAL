// Constantes métier et techniques partagées par tout le backend (décisions validées en Phase A).

// Fuseau horaire métier : « aujourd'hui », les mois et les périodes se calculent dans ce fuseau.
// Les horodatages techniques (createdAt, journaux) restent en UTC.
export const BUSINESS_TIME_ZONE = 'Africa/Dakar'

// Devise unique : le franc CFA (BCEAO). Les montants sont des entiers FCFA, sans décimale.
export const CURRENCY_CODE = 'XOF'

// Chemins de l'API.
export const API_BASE_PATH = '/api'
export const HEALTH_PATH = '/api/health'
export const API_V1_PATH = '/api/v1'

// Taille maximale d'un corps de requête JSON.
export const JSON_BODY_LIMIT = '100kb'

// Protection de base contre les abus (par adresse IP).
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
export const RATE_LIMIT_MAX_REQUESTS = 300

// Attente maximale de l'arrêt propre avant de fermer de force les connexions.
export const SHUTDOWN_TIMEOUT_MS = 10000

// Authentification (B2).
export const AUTH_PATH = '/api/auth'
export const JWT_ISSUER = 'duo-capital-api'
export const JWT_AUDIENCE = 'duo-capital-app'
export const DEFAULT_ACCESS_TOKEN_TTL_MINUTES = 15
export const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 7
export const ACCESS_COOKIE_NAME = 'dc_access'
export const REFRESH_COOKIE_NAME = 'dc_refresh'
export const ACCESS_COOKIE_PATH = API_BASE_PATH // le jeton d'accès n'est envoyé qu'à l'API
export const REFRESH_COOKIE_PATH = AUTH_PATH // le refresh token n'est envoyé qu'aux routes d'authentification
export const MIN_JWT_SECRET_LENGTH = 32

// Limitation des tentatives de connexion : par adresse IP (échecs seulement) et par compte (verrouillage temporaire).
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
export const LOGIN_RATE_LIMIT_MAX_FAILURES = 10
export const MAX_FAILED_LOGINS = 5
export const ACCOUNT_LOCK_DURATION_MS = 15 * 60 * 1000

// Longueurs maximales acceptées à la connexion (évite le hachage de données énormes).
export const MAX_EMAIL_LENGTH = 254
export const MAX_PASSWORD_LENGTH = 1024

// Opérations sensibles (changement d'email ou de mot de passe, (dés)activation d'un compte) : échecs par IP.
export const SENSITIVE_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
export const SENSITIVE_RATE_LIMIT_MAX_FAILURES = 10

// Cotisation mensuelle prévue par associé (FCFA) : décision métier (15 000 FCFA × 2 associés = 30 000 FCFA par mois).
export const MONTHLY_CONTRIBUTION_PER_PARTNER = 15000
