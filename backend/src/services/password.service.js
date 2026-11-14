import { randomBytes } from 'node:crypto'
import argon2 from 'argon2'
import { MAX_PASSWORD_LENGTH } from '../config/constants.js'

// Argon2id, paramètres minimaux recommandés par l'OWASP (19 Mio, 2 itérations, 1 thread).
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

// Empreinte factice (aléatoire à chaque démarrage) : sert à dépenser le même temps de calcul quand le compte n'existe pas,
// pour qu'une réponse rapide ne révèle pas qu'un email est inconnu.
let dummyHashPromise = null

export async function verifyAgainstDummyHash(plainPassword) {
  dummyHashPromise ??= hashPassword(randomBytes(24).toString('base64url'))
  await verifyPassword(await dummyHashPromise, plainPassword)
}
