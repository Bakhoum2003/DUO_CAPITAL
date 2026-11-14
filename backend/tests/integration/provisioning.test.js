// Création initiale des deux comptes contre une VRAIE base de test (jamais DATABASE_URL, jamais Atlas).

import mongoose from 'mongoose'
import { describe, expect, it } from 'vitest'
import { AuditLog } from '../../src/models/AuditLog.js'
import { User } from '../../src/models/User.js'
import { verifyPassword } from '../../src/services/password.service.js'
import { getProvisioningState, provisionPartners } from '../../src/services/provisioning.service.js'
import { ProvisioningAborted, runProvisioning } from '../../scripts/lib/runProvisioning.js'
import { testDatabaseUrl, useTestDatabase } from '../helpers/authFixtures.js'
import { buildTestConfig } from '../helpers/testConfig.js'

const PASSWORD_1 = 'Zèbre-bleu-Orage-4821'
const PASSWORD_2 = 'Cactus-rouge-Lune-9034'
const ARGON_STUB = '$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$aGFzaGhhc2hoYXNoaGFzaA'
const credentials = () => [
  { partnerNumber: 1, email: 'Premier@Example.com ', password: PASSWORD_1 },
  { partnerNumber: 2, email: 'second@example.com', password: PASSWORD_2 },
]
const pair = (a, b) => [{ partnerNumber: a[0], email: a[1], password: PASSWORD_1 }, { partnerNumber: b[0], email: b[1], password: PASSWORD_2 }]

function fakeIo({ interactive = true, answers = [], secrets = [] } = {}) {
  const out = []
  const a = [...answers]
  const s = [...secrets]
  return {
    out,
    isInteractive: interactive,
    print: (line) => out.push(line),
    ask: async (prompt) => { out.push(prompt); return a.shift() ?? '' },
    askSecret: async (prompt) => { out.push(prompt); return s.shift() ?? '' },
  }
}

describe.skipIf(!testDatabaseUrl())('provisioning des deux comptes (base de test)', () => {
  useTestDatabase()

  it('travaille sur une base de test uniquement', () => {
    expect(process.env.DATABASE_URL).toBeUndefined()
    expect(mongoose.connection.name).toMatch(/test/)
  })

  it('crée les deux associés : numéros, noms, email normalisé, Argon2id, audit sans secret', async () => {
    const users = await provisionPartners({ credentials: credentials() })
    expect(users.map((u) => [u.partnerNumber, u.name, u.email])).toEqual([
      [1, 'Mohamed Bakhoum', 'premier@example.com'],
      [2, 'Cheikh Sow', 'second@example.com'],
    ])
    expect(JSON.stringify(users)).not.toContain('argon2')

    const stored = await User.find().select('+passwordHash').sort({ partnerNumber: 1 })
    expect(stored[0].passwordHash.startsWith('$argon2id$')).toBe(true)
    expect(stored[0].passwordHash).not.toContain(PASSWORD_1)
    expect(await verifyPassword(stored[0].passwordHash, PASSWORD_1)).toBe(true)
    expect(await verifyPassword(stored[1].passwordHash, PASSWORD_2)).toBe(true)
    expect(await verifyPassword(stored[0].passwordHash, PASSWORD_2)).toBe(false)

    const audits = await AuditLog.find({ action: 'USER_PROVISIONED' }).lean()
    expect(audits).toHaveLength(2)
    expect(JSON.stringify(audits)).not.toContain(PASSWORD_1)
    expect(JSON.stringify(audits)).not.toContain('argon2')
  })

  it('refuse une seconde initialisation sans rien modifier', async () => {
    await provisionPartners({ credentials: credentials() })
    const before = await User.find().select('+passwordHash').sort({ partnerNumber: 1 }).lean()

    await expect(provisionPartners({ credentials: pair([1, 'x1@example.com'], [2, 'x2@example.com']) })).rejects.toMatchObject({
      status: 409,
      code: 'PROVISIONING_ALREADY_DONE',
    })

    const after = await User.find().select('+passwordHash').sort({ partnerNumber: 1 }).lean()
    expect(after.map((u) => [u.email, u.passwordHash])).toEqual(before.map((u) => [u.email, u.passwordHash]))
    expect(await User.countDocuments()).toBe(2)
  })

  it('refuse si un compte existe déjà (numéro déjà utilisé) : jamais de troisième compte', async () => {
    await User.collection.insertOne({
      partnerNumber: 2, name: 'Cheikh Sow', email: 'existant@example.com', status: 'ACTIVE',
      passwordHash: ARGON_STUB, createdAt: new Date(), updatedAt: new Date(),
    })
    await expect(provisionPartners({ credentials: credentials() })).rejects.toMatchObject({ code: 'PROVISIONING_PARTIAL_STATE' })
    expect(await User.countDocuments()).toBe(1)
  })

  it('refuse un numéro hors 1/2, un doublon, un email invalide ou partagé, un mot de passe faible', async () => {
    const bad = [
      [...credentials(), { partnerNumber: 3, email: 'c@example.com', password: PASSWORD_1 }],
      pair([1, 'a@example.com'], [3, 'b@example.com']),
      pair([1, 'a@example.com'], [1, 'b@example.com']),
      pair([1, 'invalide'], [2, 'b@example.com']),
      pair([1, 'same@example.com'], [2, 'SAME@example.com']),
      [{ partnerNumber: 1, email: 'a@example.com', password: 'court' }, { partnerNumber: 2, email: 'b@example.com', password: PASSWORD_2 }],
    ]
    for (const input of bad) {
      await expect(provisionPartners({ credentials: input })).rejects.toMatchObject({ code: 'PROVISIONING_INVALID' })
    }
    expect(await User.countDocuments()).toBe(0)
  })

  it('deux exécutions simultanées : une seule réussit, deux comptes au total', async () => {
    const results = await Promise.allSettled([provisionPartners({ credentials: credentials() }), provisionPartners({ credentials: credentials() })])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(await User.countDocuments()).toBe(2)
  })

  it('la base refuse un troisième compte ou un doublon même en contournant le service', async () => {
    await provisionPartners({ credentials: credentials() })
    await expect(User.create({ partnerNumber: 1, name: 'Intrus', email: 'intrus@example.com', passwordHash: ARGON_STUB })).rejects.toThrow()
    await expect(User.create({ partnerNumber: 3, name: 'Intrus', email: 'intrus2@example.com', passwordHash: ARGON_STUB })).rejects.toThrow()
    expect(await User.countDocuments()).toBe(2)
  })

  it('un compte ne se supprime jamais physiquement', async () => {
    await provisionPartners({ credentials: credentials() })
    await expect(User.deleteMany({})).rejects.toThrow()
    const user = await User.findOne({ partnerNumber: 1 })
    await expect(user.deleteOne()).rejects.toThrow()
    expect(await User.countDocuments()).toBe(2)
  })

  describe('script en ligne de commande (entrées/sorties simulées)', () => {
    const config = { ...buildTestConfig(), env: 'development' }
    const dbName = config.database.name
    const goodIo = (extra = {}) =>
      fakeIo({ answers: [dbName, 'Premier@example.com', 'second@example.com'], secrets: [PASSWORD_1, PASSWORD_1, PASSWORD_2, PASSWORD_2], ...extra })

    it('crée les comptes après confirmation du nom de base, sans jamais afficher un mot de passe', async () => {
      const io = goodIo()
      expect((await runProvisioning({ config, io })).status).toBe('created')
      expect(await User.countDocuments()).toBe(2)
      const output = io.out.join('\n')
      expect(output).not.toContain(PASSWORD_1)
      expect(output).not.toContain(PASSWORD_2)
      expect(output).toContain(dbName)
    })

    it('abandonne sans rien écrire si la confirmation est fausse', async () => {
      await expect(runProvisioning({ config, io: goodIo({ answers: ['mauvais-nom'] }) })).rejects.toBeInstanceOf(ProvisioningAborted)
      expect(await User.countDocuments()).toBe(0)
    })

    it('refuse un terminal non interactif et l’environnement de test', async () => {
      await expect(runProvisioning({ config, io: goodIo({ interactive: false }) })).rejects.toBeInstanceOf(ProvisioningAborted)
      await expect(runProvisioning({ config: buildTestConfig(), io: goodIo() })).rejects.toBeInstanceOf(ProvisioningAborted)
      expect(await User.countDocuments()).toBe(0)
    })

    it('simulation (--dry-run) : aucune écriture, aucun mot de passe demandé', async () => {
      const io = fakeIo()
      expect((await runProvisioning({ config, io, dryRun: true })).status).toBe('dry-run')
      expect(await User.countDocuments()).toBe(0)
      expect(io.out.some((line) => line.includes('Mot de passe'))).toBe(false)
    })

    it('comptes déjà présents : rapport, aucune modification', async () => {
      await provisionPartners({ credentials: credentials() })
      const before = (await User.find().select('+passwordHash').lean()).map((u) => u.passwordHash).sort()
      expect((await runProvisioning({ config, io: goodIo() })).status).toBe('already-initialized')
      expect((await User.find().select('+passwordHash').lean()).map((u) => u.passwordHash).sort()).toEqual(before)
      expect((await getProvisioningState()).count).toBe(2)
    })

    it('redemande la saisie si les deux mots de passe ne correspondent pas', async () => {
      const io = goodIo({ secrets: [PASSWORD_1, 'autre', PASSWORD_1, PASSWORD_1, PASSWORD_2, PASSWORD_2] })
      expect((await runProvisioning({ config, io })).status).toBe('created')
    })
  })
})
