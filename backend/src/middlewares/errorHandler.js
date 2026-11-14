import { AppError } from '../utils/AppError.js'

const GENERIC_MESSAGE = 'Une erreur est survenue.'
const DATABASE_ERROR_NAMES = new Set(['MongooseServerSelectionError', 'MongoServerSelectionError', 'MongoNetworkError'])

// Transforme n'importe quelle erreur en { status, code, message, fields? }.
// Seules les erreurs reconnues ont un message précis ; tout le reste devient une erreur 500 générique.
function normalizeError(err) {
  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message, fields: err.fields }
  }

  // Échec de validation d'une entrée (Zod) : 400 avec le détail par champ.
  if (err?.name === 'ZodError' && Array.isArray(err.issues)) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Les données envoyées sont invalides.',
      fields: err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    }
  }

  // Erreurs de lecture du corps de la requête (express.json).
  if (err?.type === 'entity.parse.failed') {
    return { status: 400, code: 'INVALID_JSON', message: 'Le corps de la requête n’est pas un JSON valide.' }
  }
  if (err?.type === 'entity.too.large') {
    return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Le corps de la requête est trop volumineux.' }
  }

  // Erreurs Mongoose / MongoDB.
  if (err?.name === 'ValidationError' && err.errors) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Les données envoyées sont invalides.',
      fields: Object.entries(err.errors).map(([field, detail]) => ({ field, message: String(detail?.message ?? 'Valeur invalide.') })),
    }
  }
  if (err?.name === 'CastError') {
    return { status: 400, code: 'INVALID_ID', message: 'Un identifiant ou une valeur a un format invalide.' }
  }
  if (err?.code === 11000) {
    return { status: 409, code: 'DUPLICATE_KEY', message: 'Cet enregistrement existe déjà.' }
  }
  if (DATABASE_ERROR_NAMES.has(err?.name)) {
    return { status: 503, code: 'DATABASE_UNAVAILABLE', message: 'Le service est momentanément indisponible.' }
  }

  return { status: 500, code: 'INTERNAL_SERVER_ERROR', message: GENERIC_MESSAGE }
}

/**
 * Gestionnaire d'erreurs central : toutes les erreurs de l'API sortent au même format
 *   { "error": { "code": "...", "message": "...", "requestId": "...", "fields": [...] } }
 * Les détails internes (message d'origine, pile d'appels) ne sont JAMAIS envoyés en production ;
 * ils sont journalisés, et visibles dans la réponse uniquement en développement.
 *
 * @param {object} options
 * @param {import('pino').Logger} options.logger
 * @param {{ isDevelopment: boolean }} options.config
 */
export function createErrorHandler({ logger, config }) {
  // Les quatre paramètres sont indispensables : c'est ainsi qu'Express reconnaît un gestionnaire d'erreurs.
  return function errorHandler(err, req, res, next) {
    if (res.headersSent) return next(err)

    const normalized = normalizeError(err)
    const log = req.log ?? logger

    if (normalized.status >= 500) log.error({ err }, 'Erreur serveur')
    else log.warn({ code: normalized.code, status: normalized.status }, 'Requête refusée')

    const body = { code: normalized.code, message: normalized.message }
    if (req.id) body.requestId = String(req.id)
    if (normalized.fields?.length) body.fields = normalized.fields
    if (config.isDevelopment && err instanceof Error) {
      body.debug = { name: err.name, message: err.message, stack: err.stack }
    }

    return res.status(normalized.status).json({ error: body })
  }
}
