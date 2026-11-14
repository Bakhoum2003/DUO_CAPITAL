import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'
import {
  generateRefreshToken,
  hashRefreshToken,
  isWellFormedRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from '../../../src/services/token.service.js'
import { buildTestConfig } from '../../helpers/testConfig.js'

const { auth } = buildTestConfig()
const USER_ID = 'a'.repeat(24)
const SESSION_ID = 'b'.repeat(24)
const NOW = new Date('2026-11-13T10:00:00.000Z')
const minutes = (count) => new Date(NOW.getTime() + count * 60 * 1000)

const errorOf = (fn) => {
  try {
    fn()
  } catch (err) {
    return err
  }
  return null
}

describe('jeton d’accès JWT', () => {
  it('signe puis vérifie : utilisateur, session et expiration à 15 minutes', () => {
    const { token, expiresAt } = signAccessToken({ userId: USER_ID, sessionId: SESSION_ID }, auth, NOW)
    expect(expiresAt.toISOString()).toBe(minutes(15).toISOString())
    expect(verifyAccessToken(token, auth, minutes(1))).toEqual({ userId: USER_ID, sessionId: SESSION_ID, expiresAt })
  })

  it('ne contient que des informations techniques (aucun email, nom ni secret)', () => {
    const { token } = signAccessToken({ userId: USER_ID, sessionId: SESSION_ID }, auth, NOW)
    const payload = jwt.decode(token)
    expect(Object.keys(payload).sort()).toEqual(['aud', 'exp', 'iat', 'iss', 'sid', 'sub', 'typ'])
    expect(token).not.toContain(auth.jwtSecret)
    expect(jwt.decode(token, { complete: true }).header.alg).toBe('HS256')
  })

  it('refuse un jeton expiré (TOKEN_EXPIRED)', () => {
    const { token } = signAccessToken({ userId: USER_ID, sessionId: SESSION_ID }, auth, NOW)
    const err = errorOf(() => verifyAccessToken(token, auth, minutes(16)))
    expect(err).toMatchObject({ status: 401, code: 'TOKEN_EXPIRED' })
  })

  it('refuse une signature falsifiée ou faite avec un autre secret', () => {
    const { token } = signAccessToken({ userId: USER_ID, sessionId: SESSION_ID }, auth, NOW)
    const [header, payload, signature] = token.split('.')
    const forged = `${header}.${payload}.${signature.slice(0, -2)}AA`
    expect(errorOf(() => verifyAccessToken(forged, auth, NOW))).toMatchObject({ code: 'INVALID_TOKEN' })

    const otherSecret = jwt.sign({ sub: USER_ID, sid: SESSION_ID, typ: 'access' }, 'un-autre-secret-de-test-0123456789abcdef', {
      algorithm: 'HS256',
      issuer: auth.issuer,
      audience: auth.audience,
      expiresIn: 600,
    })
    expect(errorOf(() => verifyAccessToken(otherSecret, auth))).toMatchObject({ code: 'INVALID_TOKEN' })
  })

  it('refuse l’algorithme « none » et un autre algorithme HMAC', () => {
    const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
    const exp = Math.floor(Date.now() / 1000) + 600
    const claims = { sub: USER_ID, sid: SESSION_ID, typ: 'access', iss: auth.issuer, aud: auth.audience, exp }
    const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64(claims)}.`
    expect(errorOf(() => verifyAccessToken(none, auth))).toMatchObject({ code: 'INVALID_TOKEN' })

    const hs512 = jwt.sign(claims, auth.jwtSecret, { algorithm: 'HS512' })
    expect(errorOf(() => verifyAccessToken(hs512, auth))).toMatchObject({ code: 'INVALID_TOKEN' })
  })

  it('refuse un mauvais émetteur, une mauvaise audience et un mauvais type', () => {
    const sign = (claims, options = {}) =>
      jwt.sign({ sub: USER_ID, sid: SESSION_ID, typ: 'access', ...claims }, auth.jwtSecret, {
        algorithm: 'HS256',
        issuer: auth.issuer,
        audience: auth.audience,
        expiresIn: 600,
        ...options,
      })
    expect(errorOf(() => verifyAccessToken(sign({}, { issuer: 'autre' }), auth))).toMatchObject({ code: 'INVALID_TOKEN' })
    expect(errorOf(() => verifyAccessToken(sign({}, { audience: 'autre' }), auth))).toMatchObject({ code: 'INVALID_TOKEN' })
    expect(errorOf(() => verifyAccessToken(sign({ typ: 'refresh' }), auth))).toMatchObject({ code: 'INVALID_TOKEN' })
    expect(errorOf(() => verifyAccessToken(sign({ typ: undefined }), auth))).toMatchObject({ code: 'INVALID_TOKEN' })
  })

  it('refuse des identifiants qui ne sont pas des ObjectId', () => {
    const token = jwt.sign({ sub: '{"$ne":null}', sid: SESSION_ID, typ: 'access' }, auth.jwtSecret, {
      algorithm: 'HS256',
      issuer: auth.issuer,
      audience: auth.audience,
      expiresIn: 600,
    })
    expect(errorOf(() => verifyAccessToken(token, auth))).toMatchObject({ code: 'INVALID_TOKEN' })
  })

  it.each(['', 'abc', 'a.b.c', 'Bearer xxx', undefined, null])('refuse la valeur %s', (value) => {
    expect(errorOf(() => verifyAccessToken(value, auth))).toMatchObject({ status: 401, code: 'INVALID_TOKEN' })
  })
})

describe('refresh token', () => {
  it('génère 256 bits aléatoires encodés en base64url, uniques', () => {
    const first = generateRefreshToken()
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(isWellFormedRefreshToken(first)).toBe(true)
    expect(generateRefreshToken()).not.toBe(first)
  })

  it('le hash est un SHA-256 hexadécimal stable, différent du jeton', () => {
    const token = generateRefreshToken()
    const hash = hashRefreshToken(token)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hashRefreshToken(token)).toBe(hash)
    expect(hash).not.toContain(token)
    expect(hashRefreshToken('a'.repeat(43))).toBe('66d34fba71f8f450f7e45598853e53bfc23bbd129027cbb131a2f4ffd7878cd0')
  })

  it.each(['', 'court', 'x'.repeat(44), `${'a'.repeat(42)}!`, undefined, null, 42, { $ne: null }])('rejette la forme %s', (value) => {
    expect(isWellFormedRefreshToken(value)).toBe(false)
  })
})
