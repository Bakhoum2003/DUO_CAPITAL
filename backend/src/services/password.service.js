import { randomBytes } from 'node:crypto'
import argon2 from 'argon2'
import { MAX_PASSWORD_LENGTH } from '../config/constants.js'

const ARGON2_OPTIONS = Object.freeze({ type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 })

/** Hache un mot de passe en Argon2id (sel aléatoire intégré à l'empreinte). */
export async function hashPassword(plainPassword) {
  if (typeof plainPassword !== 'string' || plainPassword.length === 0 || plainPassword.length > MAX_PASSWORD_LENGTH) {
    throw new TypeError('Mot de passe invalide.')
  }
  return argon2.hash(plainPassword, ARGON2_OPTIONS)
}

/** Vérifie un mot de passe. Toute empreinte absente, mal formée ou qui n'est pas Argon2id donne `false`. */
export async function verifyPassword(passwordHash, plainPassword) {
  if (typeof passwordHash !== 'string' || !passwordHash.startsWith('$argon2id$')) return false
  if (typeof plainPassword !== 'string' || plainPassword.length > MAX_PASSWORD_LENGTH) return false
  try {
    return await argon2.verify(passwordHash, plainPassword)
  } catch {
    return false
  }
}

let dummyHashPromise = null

export async function verifyAgainstDummyHash(plainPassword) {
  dummyHashPromise ??= hashPassword(randomBytes(24).toString('base64url'))
  await verifyPassword(await dummyHashPromise, plainPassword)
}
