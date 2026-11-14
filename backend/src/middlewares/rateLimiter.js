import { rateLimit } from 'express-rate-limit'
import { AppError } from '../utils/AppError.js'

/**
 * Protection de base contre les abus : nombre maximal de requêtes par adresse IP et par fenêtre de temps.
 * Au-delà : erreur 429 au format JSON commun, avec les en-têtes standard RateLimit / Retry-After.
 *
 * @param {object} options
 * @param {number} options.windowMs durée de la fenêtre (ms)
 * @param {number} options.max requêtes autorisées par fenêtre
 * @param {boolean} [options.skipSuccessfulRequests] ne compter que les réponses en échec (statut ≥ 400), ex. connexion
 * @param {string} [options.code] code d'erreur renvoyé au dépassement
 * @param {string} [options.message] message renvoyé au dépassement
 */
export function createRateLimiter({
  windowMs,
  max,
  skipSuccessfulRequests = false,
  code = 'TOO_MANY_REQUESTS',
  message = 'Trop de requêtes. Veuillez réessayer plus tard.',
}) {
  return rateLimit({
    windowMs,
    limit: max,
    skipSuccessfulRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new AppError({ status: 429, code, message }))
    },
  })
}
