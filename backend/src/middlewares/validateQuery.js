import { AppError } from '../utils/AppError.js'

/**
 * Valide les paramètres d'URL avec un schéma Zod (paramètres inconnus refusés).
 * Le résultat nettoyé est placé dans `req.validatedQuery` (req.query est en lecture seule sous Express 5).
 */
export function validateQuery(schema) {
  return function validate(req, _res, next) {
    const result = schema.safeParse(req.query ?? {})
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({ field: issue.path.join('.') || 'query', message: issue.message }))
      return next(new AppError({ status: 400, code: 'VALIDATION_ERROR', message: 'Les paramètres de la requête sont invalides.', fields }))
    }
    req.validatedQuery = result.data
    return next()
  }
}
