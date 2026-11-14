const ALLOWED_METHODS = ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
const ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id']
const EXPOSED_HEADERS = ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After']
const PREFLIGHT_MAX_AGE_SECONDS = 600

/**
 * Options CORS : seules les adresses listées (FRONTEND_URL) reçoivent les en-têtes CORS.
 * Les requêtes sans en-tête Origin (outils, serveur à serveur) ne sont pas des requêtes de navigateur
 * inter-origines : elles passent, sans en-tête CORS. Les cookies sont autorisés (authentification à venir).
 *
 * @param {readonly string[]} allowedOrigins origines autorisées, ex. ['http://localhost:5173']
 */
export function createCorsOptions(allowedOrigins) {
  const allowed = new Set(allowedOrigins)

  return {
    origin(origin, callback) {
      callback(null, typeof origin === 'string' && allowed.has(origin))
    },
    credentials: true,
    methods: ALLOWED_METHODS,
    allowedHeaders: ALLOWED_HEADERS,
    exposedHeaders: EXPOSED_HEADERS,
    maxAge: PREFLIGHT_MAX_AGE_SECONDS,
    optionsSuccessStatus: 204,
  }
}
