import { describe, expect, it } from 'vitest'
import { clearAuthCookies, parseCookies, setAuthCookies } from '../../../src/utils/cookies.js'

function fakeResponse() {
  const calls = { set: [], clear: [] }
  return {
    calls,
    cookie: (name, value, options) => calls.set.push({ name, value, options }),
    clearCookie: (name, options) => calls.clear.push({ name, options }),
  }
}

const NOW = new Date('2026-11-13T10:00:00.000Z')
const tokens = {
  accessToken: 'jeton-acces',
  accessExpiresAt: new Date(NOW.getTime() + 15 * 60 * 1000),
  refreshToken: 'jeton-refresh',
  refreshExpiresAt: new Date(NOW.getTime() + 7 * 24 * 3600 * 1000),
}

describe('parseCookies', () => {
  it('lit plusieurs cookies et décode les valeurs', () => {
    expect(parseCookies('a=1; b=deux%20mots; c="entre guillemets"')).toEqual({ a: '1', b: 'deux mots', c: 'entre guillemets' })
  })
  it('la première occurrence d’un nom l’emporte (pas de cookie écrasé par un doublon)', () => {
    expect(parseCookies('dc_access=vrai; dc_access=faux').dc_access).toBe('vrai')
  })
  it('ignore les entrées sans « = », les noms vides et les en-têtes absents', () => {
    expect(parseCookies('abc; =vide; ok=1')).toEqual({ ok: '1' })
    expect(parseCookies(undefined)).toEqual({})
    expect(parseCookies('')).toEqual({})
  })
  it('garde une valeur mal encodée telle quelle au lieu de planter', () => {
    expect(parseCookies('a=%E0%A4%A')).toEqual({ a: '%E0%A4%A' })
  })
  it('ne permet pas de polluer les prototypes', () => {
    const cookies = parseCookies('__proto__=x; constructor=y')
    expect(Object.getPrototypeOf(cookies)).toBe(Object.prototype)
    expect({}.x).toBeUndefined()
  })
})

describe('setAuthCookies', () => {
  it('pose deux cookies HttpOnly, aux chemins restreints, avec leur durée de vie', () => {
    const res = fakeResponse()
    setAuthCookies(res, tokens, { secure: false, sameSite: 'lax' }, NOW)
    const [access, refresh] = res.calls.set
    expect(access.name).toBe('dc_access')
    expect(access.options).toEqual({ httpOnly: true, secure: false, sameSite: 'lax', path: '/api', maxAge: 15 * 60 * 1000 })
    expect(refresh.name).toBe('dc_refresh')
    expect(refresh.options).toEqual({ httpOnly: true, secure: false, sameSite: 'lax', path: '/api/auth', maxAge: 7 * 24 * 3600 * 1000 })
  })

  it('applique Secure et SameSite selon la configuration', () => {
    const res = fakeResponse()
    setAuthCookies(res, tokens, { secure: true, sameSite: 'none' }, NOW)
    for (const call of res.calls.set) {
      expect(call.options.secure).toBe(true)
      expect(call.options.sameSite).toBe('none')
      expect(call.options.httpOnly).toBe(true)
    }
  })
})

describe('clearAuthCookies', () => {
  it('supprime les deux cookies avec les mêmes attributs que lors de la création', () => {
    const res = fakeResponse()
    clearAuthCookies(res, { secure: true, sameSite: 'strict' })
    expect(res.calls.clear).toEqual([
      { name: 'dc_access', options: { httpOnly: true, secure: true, sameSite: 'strict', path: '/api' } },
      { name: 'dc_refresh', options: { httpOnly: true, secure: true, sameSite: 'strict', path: '/api/auth' } },
    ])
  })
})
