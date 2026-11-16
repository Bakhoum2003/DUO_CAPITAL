import { randomUUID } from 'node:crypto'
import pinoHttp from 'pino-http'

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/

/**
 * Journalise chaque requête (méthode, adresse sans paramètres, statut, durée) et attache un identifiant
 * unique (en-tête X-Request-Id) pour relier une réponse d'erreur à ses journaux.
 * Ni corps de requête, ni en-têtes sensibles, ni paramètres d'URL ne sont journalisés.
 *
 * @param {import('pino').Logger} logger
 */
export function createRequestLogger(logger) {
  return pinoHttp({
    logger,
    genReqId(req, res) {
      const incoming = req.headers['x-request-id']
      const id = typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID()
      res.setHeader('X-Request-Id', id)
      return id
    },
    customLogLevel(_req, res, err) {
      if (err || res.statusCode >= 500) return 'error'
      if (res.statusCode >= 400) return 'warn'
      return 'info'
    },
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: String(req.url).split('?')[0] }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  })
}
