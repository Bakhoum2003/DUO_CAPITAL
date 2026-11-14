import { describe, expect, it } from 'vitest'
import {
  findSensitiveKey,
  isBusinessDate,
  isEmail,
  isFcfaAmount,
  isHttpUrl,
  isPasswordHash,
  isPeriod,
  isSha256Hex,
  jsonByteSize,
  toNameKey,
} from '../../../src/models/shared/validators.js'

describe('isFcfaAmount', () => {
  it.each([1, 500, 15000, 2_000_000, Number.MAX_SAFE_INTEGER])('accepte %s', (value) => {
    expect(isFcfaAmount(value)).toBe(true)
  })
  it.each([0, -1, 1.5, 0.1 + 0.2, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1000', null, undefined])('refuse %s', (value) => {
    expect(isFcfaAmount(value)).toBe(false)
  })
})

describe('isBusinessDate', () => {
  it.each(['2026-01-31', '2024-02-29', '2000-01-01', '2100-12-31'])('accepte %s', (value) => {
    expect(isBusinessDate(value)).toBe(true)
  })
  it.each(['2026-02-30', '2025-02-29', '2026-13-01', '2026-00-10', '26-01-01', '2026-1-1', '2026-01-01T00:00:00Z', '1999-12-31', '2101-01-01', '', null, 20260101])('refuse %s', (value) => {
    expect(isBusinessDate(value)).toBe(false)
  })
})

describe('isPeriod', () => {
  it.each(['2026-01', '2026-12'])('accepte %s', (value) => expect(isPeriod(value)).toBe(true))
  it.each(['2026-00', '2026-13', '2026-1', '2026-01-01', '1999-01', null])('refuse %s', (value) => expect(isPeriod(value)).toBe(false))
})

describe('isEmail', () => {
  it('accepte une adresse correcte', () => expect(isEmail('mohamed@example.com')).toBe(true))
  it.each(['', 'abc', 'a@b', 'a b@c.d', '@c.d', null])('refuse %s', (value) => expect(isEmail(value)).toBe(false))
})

describe('isPasswordHash', () => {
  it('accepte bcrypt et argon2', () => {
    expect(isPasswordHash(`$2b$12$${'a'.repeat(53)}`)).toBe(true)
    expect(isPasswordHash(`$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$${'a'.repeat(43)}`)).toBe(true)
  })
  it('refuse un mot de passe en clair ou une empreinte inconnue', () => {
    expect(isPasswordHash('MotDePasse123!')).toBe(false)
    expect(isPasswordHash('5f4dcc3b5aa765d61d8327deb882cf99')).toBe(false)
    expect(isPasswordHash('$2b$12$trop-court')).toBe(false)
    expect(isPasswordHash('')).toBe(false)
  })
})

describe('isSha256Hex / isHttpUrl', () => {
  it('SHA-256 : 64 caractères hexadécimaux minuscules', () => {
    expect(isSha256Hex('a'.repeat(64))).toBe(true)
    expect(isSha256Hex('A'.repeat(64))).toBe(false)
    expect(isSha256Hex('a'.repeat(63))).toBe(false)
  })
  it('URL : http(s) seulement', () => {
    expect(isHttpUrl('https://example.com/recu.pdf')).toBe(true)
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpUrl('ftp://example.com/a')).toBe(false)
    expect(isHttpUrl('pas une url')).toBe(false)
  })
})

describe('findSensitiveKey', () => {
  it('trouve un secret à tout niveau', () => {
    expect(findSensitiveKey({ amount: 1, nested: { list: [{ refreshToken: 'x' }] } })).toBe('nested.list.0.refreshToken')
    expect(findSensitiveKey({ passwordHash: 'x' })).toBe('passwordHash')
    expect(findSensitiveKey({ Authorization: 'Bearer x' })).toBe('Authorization')
    expect(findSensitiveKey({ api_key: 'x' })).toBe('api_key')
  })
  it('laisse passer les données utiles', () => {
    expect(findSensitiveKey({ amount: 5000, status: 'ACTIVE', date: new Date(), name: 'Mohamed' })).toBeNull()
    expect(findSensitiveKey(null)).toBeNull()
  })
})

describe('jsonByteSize / toNameKey', () => {
  it('mesure la taille JSON', () => {
    expect(jsonByteSize({ a: 1 })).toBe(7)
    expect(jsonByteSize(undefined)).toBe(0)
  })
  it('normalise un nom (accents, casse, espaces)', () => {
    expect(toNameKey('  Élevage   de Poulets ')).toBe('elevage de poulets')
  })
})
