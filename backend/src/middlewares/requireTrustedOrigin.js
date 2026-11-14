import { AppError } from '../utils/AppError.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Protection CSRF pour une API à cookies : toute requête qui modifie des données et qui annonce une origine
 * (les navigateurs l'ajoutent toujours en inter-origines) doit venir d'une adresse autorisée (FRONTEND_URL).
 * S'ajoute à SameSite et à la liste CORS. Les requêtes sans en-tête Origin (outils, serveur à serveur) ne sont pas
 * des requêtes de navigateur inter-origines : elles passent, mais restent soumises à l'authentification.
 *
 * @param {readonly string[]} allowedOrigins
 */
export function requireTrustedOrigin(allowedOrigins) {
  const allowed = new Set(allowedOrigins)

  return function checkOrigin(req, _res, next) {
    if (SAFE_METHODS.has(req.method)) return next()

    const origin = req.get('Origin')
    if (origin !== undefined && !allowed.has(origin)) {
      return next(new AppError({ status: 403, code: 'FORBIDDEN_ORIGIN', message: 'Origine non autorisée.' }))
    }
    return next()
  }
}
