import { AppError } from '../utils/AppError.js'

/**
 * Valide et nettoie le corps JSON avec un schéma Zod (champs inconnus refusés par `.strict()`).
 * En cas d'échec : 400 VALIDATION_ERROR avec le détail par champ (messages du schéma, jamais les valeurs).
 */
export function validateBody(schema) {
  return function validate(req, _res, next) {
    const result = schema.safeParse(req.body ?? {})
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message }))
      return next(new AppError({ status: 400, code: 'VALIDATION_ERROR', message: 'Les données envoyées sont invalides.', fields }))
    }
    req.body = result.data
    return next()
  }
}
