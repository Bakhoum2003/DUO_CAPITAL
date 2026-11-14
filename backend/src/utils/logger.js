import pino from 'pino'

/**
 * Journalisation structurée (JSON) avec horodatage ISO en UTC.
 * Les en-têtes sensibles et les champs « password » / « token » sont masqués.
 * En développement, la sortie est mise en forme lisible (pino-pretty).
 *
 * @param {object} options
 * @param {string} options.level niveau minimal (fatal, error, warn, info, debug, trace, silent)
 * @param {string} options.environment development | test | production
 * @param {import('node:stream').Writable} [options.destination] flux de sortie (utilisé par les tests)
 */
export function createLogger({ level, environment, destination }) {
  const options = {
    level,
    base: { service: 'duo-capital-api', env: environment },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]', '*.password', '*.token', '*.passwordHash', '*.refreshToken', '*.accessToken', '*.refreshTokenHash', '*.jwtSecret'],
      censor: '[MASQUÉ]',
    },
  }

  if (destination) return pino(options, destination)

  if (environment === 'development') {
    return pino({
      ...options,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: "UTC:yyyy-mm-dd HH:MM:ss.l'Z'", ignore: 'pid,hostname,service,env' },
      },
    })
  }

  return pino(options)
}
