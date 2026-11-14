import { AppError } from '../utils/AppError.js'

/** Dernière route avant le gestionnaire d'erreurs : toute adresse inconnue répond 404 au format JSON commun. */
export function notFound(_req, _res, next) {
  next(new AppError({ status: 404, code: 'NOT_FOUND', message: 'La ressource demandée est introuvable.' }))
}
