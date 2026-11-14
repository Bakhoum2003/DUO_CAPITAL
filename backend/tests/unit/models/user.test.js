import mongoose from 'mongoose'
import { describe, expect, it } from 'vitest'
import { User } from '../../../src/models/User.js'
import { FAKE_ARGON2_HASH, FAKE_BCRYPT_HASH, indexByName, invalidPaths } from '../../helpers/modelFixtures.js'

const valid = (overrides = {}) => ({
  partnerNumber: 1,
  name: 'Mohamed Bakhoum',
  email: 'mohamed@example.com',
  passwordHash: FAKE_BCRYPT_HASH,
  ...overrides,
})

describe('modèle User', () => {
  it("n'ouvre aucune connexion à une base", async () => {
    expect(mongoose.connection.readyState).toBe(0)
    expect(process.env.DATABASE_URL).toBeUndefined()
  })

  it('accepte un associé valide (bcrypt ou argon2) avec les valeurs par défaut', async () => {
    const user = new User(valid())
    expect(await invalidPaths(user)).toEqual([])
    expect(await invalidPaths(new User(valid({ passwordHash: FAKE_ARGON2_HASH })))).toEqual([])
    expect(user.status).toBe('ACTIVE')
    expect(user.failedLoginAttempts).toBe(0)
    expect(user.lockedUntil).toBeNull()
  })

  it('normalise l’email (minuscules, sans espaces)', async () => {
    expect(new User(valid({ email: '  Mohamed@Example.COM ' })).email).toBe('mohamed@example.com')
  })

  it('refuse les champs obligatoires manquants', async () => {
    expect((await invalidPaths(new User({}))).sort()).toEqual(['email', 'name', 'partnerNumber', 'passwordHash'])
  })

  it('refuse un numéro d’associé autre que 1 ou 2 (pas de troisième compte possible)', async () => {
    expect(await invalidPaths(new User(valid({ partnerNumber: 3 })))).toContain('partnerNumber')
    expect(await invalidPaths(new User(valid({ partnerNumber: 0 })))).toContain('partnerNumber')
  })

  it('refuse un mot de passe en clair', async () => {
    expect(await invalidPaths(new User(valid({ passwordHash: 'MotDePasse123!' })))).toContain('passwordHash')
  })

  it('refuse un email invalide, un nom trop court, un état inconnu', async () => {
    expect(await invalidPaths(new User(valid({ email: 'pas-un-email' })))).toContain('email')
    expect(await invalidPaths(new User(valid({ name: 'A' })))).toContain('name')
    expect(await invalidPaths(new User(valid({ status: 'ADMIN' })))).toContain('status')
  })

  it('n’a aucun rôle : un champ role est refusé', async () => {
    expect(() => new User(valid({ role: 'ADMIN' }))).toThrow()
    expect(User.schema.path('role')).toBeUndefined()
  })

  it('ne sérialise jamais l’empreinte du mot de passe', async () => {
    const json = new User(valid()).toJSON()
    expect(json.passwordHash).toBeUndefined()
    expect(json.id).toBeTruthy()
    expect(json._id).toBeUndefined()
    expect(JSON.stringify(json)).not.toContain('$2b$')
  })

  it('masque passwordHash par défaut dans les requêtes (select: false)', async () => {
    expect(User.schema.path('passwordHash').options.select).toBe(false)
  })

  it('déclare l’unicité de l’email et du numéro d’associé', async () => {
    expect(indexByName(User, 'uniq_user_email').options.unique).toBe(true)
    expect(indexByName(User, 'uniq_user_partner_number').options.unique).toBe(true)
  })

  it('active la concurrence optimiste (transactions futures)', async () => {
    expect(User.schema.options.optimisticConcurrency).toBe(true)
  })
})
