import { describe, expect, it } from 'vitest'
import { isPasswordHash } from '../../../src/models/shared/validators.js'
import { hashPassword, verifyAgainstDummyHash, verifyPassword } from '../../../src/services/password.service.js'

const PASSWORD = 'Mot-de-passe-de-test-1!'
const FAKE_BCRYPT = `$2b$12$${'a'.repeat(53)}`

describe('service de mot de passe (Argon2id)', () => {
  it('produit une empreinte Argon2id acceptée par le modèle User, sans le mot de passe en clair', async () => {
    const hash = await hashPassword(PASSWORD)
    expect(hash.startsWith('$argon2id$')).toBe(true)
    expect(hash).toContain('m=19456,t=2,p=1')
    expect(hash).not.toContain(PASSWORD)
    expect(isPasswordHash(hash)).toBe(true)
  })

  it('utilise un sel aléatoire : deux empreintes du même mot de passe diffèrent', async () => {
    expect(await hashPassword(PASSWORD)).not.toBe(await hashPassword(PASSWORD))
  })

  it('vérifie le bon mot de passe et refuse les autres', async () => {
    const hash = await hashPassword(PASSWORD)
    expect(await verifyPassword(hash, PASSWORD)).toBe(true)
    expect(await verifyPassword(hash, `${PASSWORD}x`)).toBe(false)
    expect(await verifyPassword(hash, '')).toBe(false)
    expect(await verifyPassword(hash, 'x'.repeat(2000))).toBe(false)
  })

  it('refuse toute empreinte absente, mal formée ou qui n’est pas Argon2id', async () => {
    expect(await verifyPassword(undefined, PASSWORD)).toBe(false)
    expect(await verifyPassword('', PASSWORD)).toBe(false)
    expect(await verifyPassword('$argon2id$tronquee', PASSWORD)).toBe(false)
    expect(await verifyPassword(FAKE_BCRYPT, PASSWORD)).toBe(false)
  })

  it('refuse de hacher une valeur vide, non textuelle ou démesurée', async () => {
    await expect(hashPassword('')).rejects.toThrow()
    await expect(hashPassword(undefined)).rejects.toThrow()
    await expect(hashPassword('x'.repeat(2000))).rejects.toThrow()
  })

  it('l’empreinte factice sert à égaliser le temps de réponse sans erreur', async () => {
    await expect(verifyAgainstDummyHash(PASSWORD)).resolves.toBeUndefined()
  })
})
