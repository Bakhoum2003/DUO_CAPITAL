import { describe, expect, it } from 'vitest'
import { requireTrustedOrigin } from '../../../src/middlewares/requireTrustedOrigin.js'
import { validateBody } from '../../../src/middlewares/validateBody.js'
import { normalizeEmail, toPublicUser } from '../../../src/services/auth.service.js'
import { loginSchema } from '../../../src/validation/auth.schemas.js'

const ALLOWED = 'http://localhost:5173'

function run(middleware, req) {
  let forwarded
  middleware(req, {}, (err) => (forwarded = err ?? null))
  return forwarded
}

const request = (method, origin) => ({ method, get: (name) => (name === 'Origin' ? origin : undefined) })

describe('requireTrustedOrigin', () => {
  const guard = requireTrustedOrigin([ALLOWED])

  it('laisse passer une origine autorisée et une requête sans Origin', () => {
    expect(run(guard, request('POST', ALLOWED))).toBeNull()
    expect(run(guard, request('POST', undefined))).toBeNull()
  })

  it.each(['https://pirate.example.com', 'null', 'http://localhost:5174', 'http://localhost:5173.evil.com'])('refuse l’origine %s sur une requête modifiante', (origin) => {
    for (const method of ['POST', 'PATCH', 'DELETE']) {
      expect(run(guard, request(method, origin))).toMatchObject({ status: 403, code: 'FORBIDDEN_ORIGIN' })
    }
  })

  it('ne bloque pas les lectures', () => {
    expect(run(guard, request('GET', 'https://pirate.example.com'))).toBeNull()
  })
})

describe('schéma de connexion et validateBody', () => {
  const validate = validateBody(loginSchema)

  it('accepte un email et un mot de passe, et rogne l’email', () => {
    const req = { body: { email: '  mohamed@example.com ', password: 'x' } }
    expect(run(validate, req)).toBeNull()
    expect(req.body).toEqual({ email: 'mohamed@example.com', password: 'x' })
  })

  it.each([
    [{}],
    [{ email: 'a@b.co' }],
    [{ password: 'x' }],
    [{ email: '', password: 'x' }],
    [{ email: 'a@b.co', password: '' }],
    [{ email: 'a@b.co', password: 'x', role: 'ADMIN' }],
    [{ email: 'a@b.co', password: 'x'.repeat(1025) }],
    [{ email: `${'a'.repeat(250)}@b.co`, password: 'x' }],
    [{ email: { $ne: null }, password: 'x' }],
    [{ email: 'a@b.co', password: { $ne: null } }],
    [undefined],
  ])('refuse %j (400 VALIDATION_ERROR)', (body) => {
    expect(run(validate, { body })).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
  })

  it('ne renvoie jamais les valeurs saisies dans les erreurs', () => {
    const err = run(validate, { body: { email: 'a@b.co', password: 'x'.repeat(1025), extra: 'secret-fictif' } })
    expect(JSON.stringify(err.fields)).not.toContain('secret-fictif')
    expect(JSON.stringify(err.fields)).not.toContain('xxxxxxxx')
  })
})

describe('normalizeEmail et toPublicUser', () => {
  it('normalise l’email', () => {
    expect(normalizeEmail('  Mohamed@Example.COM ')).toBe('mohamed@example.com')
    expect(normalizeEmail(undefined)).toBe('')
  })

  it('ne retourne que les informations publiques', () => {
    const user = {
      _id: 'a'.repeat(24),
      name: 'Mohamed Bakhoum',
      email: 'mohamed@example.com',
      partnerNumber: 1,
      passwordHash: '$argon2id$secret',
      failedLoginAttempts: 3,
      lockedUntil: new Date(),
      status: 'ACTIVE',
    }
    expect(toPublicUser(user)).toEqual({ id: 'a'.repeat(24), name: 'Mohamed Bakhoum', email: 'mohamed@example.com', partnerNumber: 1 })
  })
})
