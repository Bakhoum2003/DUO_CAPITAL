import mongoose from 'mongoose'

export const oid = () => new mongoose.Types.ObjectId()

// Empreintes FICTIVES (format valide, aucune valeur réelle).
export const FAKE_BCRYPT_HASH = `$2b$12$${'a'.repeat(53)}`
export const FAKE_ARGON2_HASH = `$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$${'a'.repeat(43)}`
export const FAKE_SHA256 = 'a'.repeat(64)

/**
 * Noms des champs invalides d'un document, après la validation complète (hooks `pre('validate')` inclus),
 * sans aucune base de données. Toute autre erreur que ValidationError est relancée.
 */
export async function invalidPaths(document) {
  try {
    await document.validate()
    return []
  } catch (err) {
    if (err?.name !== 'ValidationError') throw err
    return Object.keys(err.errors ?? {})
  }
}

export function indexByName(Model, name) {
  const found = Model.schema.indexes().find(([, options]) => options?.name === name)
  return found ? { fields: found[0], options: found[1] } : null
}

export const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)
