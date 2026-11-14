import { describe, expect, it } from 'vitest'
import { createErrorHandler } from '../../src/middlewares/errorHandler.js'
import { AppError } from '../../src/utils/AppError.js'
import { createSilentLogger } from '../helpers/testConfig.js'

function run(err, { isDevelopment = false, headersSent = false } = {}) {
  const logger = createSilentLogger()
  const handler = createErrorHandler({ logger, config: { isDevelopment } })
  const res = { statusCode: 0, body: undefined, headersSent }
  res.status = (code) => ((res.statusCode = code), res)
  res.json = (body) => ((res.body = body), res)
  let forwarded
  handler(err, { id: 'req-1' }, res, (e) => (forwarded = e))
  return { res, logger, forwarded }
}

describe('errorHandler', () => {
  it('formate une AppError', () => {
    const { res } = run(new AppError({ status: 409, code: 'CONFLICT', message: 'Conflit.' }))
    expect(res.statusCode).toBe(409)
    expect(res.body).toEqual({ error: { code: 'CONFLICT', message: 'Conflit.', requestId: 'req-1' } })
  })

  it('transforme une erreur inconnue en 500 générique, sans détail interne', () => {
    const { res, logger } = run(new Error('mot de passe de la base : abc'))
    expect(res.statusCode).toBe(500)
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR')
    expect(res.body.error.message).toBe('Une erreur est survenue.')
    expect(JSON.stringify(res.body)).not.toContain('abc')
    expect(res.body.error.debug).toBeUndefined()
    expect(logger.calls.error.length).toBe(1)
  })

  it('ajoute le détail technique uniquement en développement', () => {
    const { res } = run(new Error('détail'), { isDevelopment: true })
    expect(res.body.error.debug.message).toBe('détail')
  })

  it('traduit une erreur Zod en 400 avec les champs', () => {
    const zodLike = { name: 'ZodError', issues: [{ path: ['amount'], message: 'Montant invalide' }] }
    const { res } = run(zodLike)
    expect(res.statusCode).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.fields).toEqual([{ field: 'amount', message: 'Montant invalide' }])
  })

  it('traduit un JSON mal formé en 400 INVALID_JSON', () => {
    const { res } = run(Object.assign(new Error('x'), { type: 'entity.parse.failed' }))
    expect(res.statusCode).toBe(400)
    expect(res.body.error.code).toBe('INVALID_JSON')
  })

  it('traduit un corps trop gros en 413', () => {
    const { res } = run(Object.assign(new Error('x'), { type: 'entity.too.large' }))
    expect(res.statusCode).toBe(413)
  })

  it('traduit une clé dupliquée en 409', () => {
    const { res } = run(Object.assign(new Error('E11000'), { code: 11000 }))
    expect(res.statusCode).toBe(409)
    expect(res.body.error.code).toBe('DUPLICATE_KEY')
  })

  it('traduit une base injoignable en 503', () => {
    const { res } = run(Object.assign(new Error('connexion'), { name: 'MongoServerSelectionError' }))
    expect(res.statusCode).toBe(503)
    expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE')
  })

  it('transmet l’erreur si la réponse est déjà partie', () => {
    const err = new Error('tard')
    const { forwarded } = run(err, { headersSent: true })
    expect(forwarded).toBe(err)
  })
})
