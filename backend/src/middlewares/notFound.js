import { AppError } from '../utils/AppError.js'

export function notFound(_req, _res, next) {
  next(new AppError({ status: 404, code: 'NOT_FOUND', message: 'La ressource demandée est introuvable.' }))
}
