
export const BUSINESS_TIME_ZONE = 'Africa/Dakar'

export const CURRENCY_CODE = 'XOF'

export const API_BASE_PATH = '/api'
export const HEALTH_PATH = '/api/health'
export const API_V1_PATH = '/api/v1'

export const JSON_BODY_LIMIT = '100kb'

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
export const RATE_LIMIT_MAX_REQUESTS = 300

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

export const MAX_EMAIL_LENGTH = 254
export const MAX_PASSWORD_LENGTH = 1024

// Opérations sensibles (changement d'email ou de mot de passe, (dés)activation d'un compte) : échecs par IP.
export const SENSITIVE_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
export const SENSITIVE_RATE_LIMIT_MAX_FAILURES = 10

export const MONTHLY_CONTRIBUTION_PER_PARTNER = 15000
