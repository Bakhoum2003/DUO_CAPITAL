
import { MAX_BUSINESS_YEAR, MIN_BUSINESS_YEAR } from './constants.js'

export function isFcfaAmount(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1
}

function isValidYear(year) {
  return year >= MIN_BUSINESS_YEAR && year <= MAX_BUSINESS_YEAR
}

/** Date métier « AAAA-MM-JJ » qui existe réellement au calendrier (refuse 2026-02-30). */
export function isBusinessDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (!isValidYear(year)) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function isPeriod(value) {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false
  return isValidYear(Number(value.slice(0, 4)))
}

export function isEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

/** Empreinte de mot de passe argon2 ou bcrypt : refuse tout mot de passe en clair. */
export function isPasswordHash(value) {
  return typeof value === 'string' && (/^\$argon2(?:id|i|d)\$[ -~]{20,}$/.test(value) || /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value))
}

export function isSha256Hex(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
}

export function isHttpUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype
}

const SENSITIVE_KEY_PARTS = ['password', 'passwd', 'token', 'secret', 'authorization', 'cookie', 'apikey', 'privatekey', 'credential']

/**
 * Cherche une clé qui ressemble à un secret (mot de passe, jeton, cookie…) dans un objet, à tout niveau.
 * @returns {string | null} chemin de la première clé sensible trouvée, ou null
 */
export function findSensitiveKey(value, path = '', depth = 0) {
  if (value === null || typeof value !== 'object' || depth > 10) return null
  if (value instanceof Date) return null

  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part))) return childPath
    const nested = findSensitiveKey(child, childPath, depth + 1)
    if (nested) return nested
  }
  return null
}

export function jsonByteSize(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value) ?? '')
  } catch {
    return Infinity
  }
}

export function toNameKey(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
