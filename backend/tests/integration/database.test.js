
import mongoose from 'mongoose'
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { checkDatabaseHealth, connectDatabase, disconnectDatabase } from '../../src/config/database.js'
import { assertSafeTestDatabaseUri } from '../../src/config/env.js'
import { assertDisposableTestDatabaseName, assertTestDatabaseName, createDisposableDatabaseName, dropTestDatabase, withDatabaseName } from '../helpers/testDatabase.js'

const testDatabaseUrl = inject('testDatabaseUrl')
const hasDatabase = Boolean(testDatabaseUrl)
const databaseUrl = hasDatabase ? withDatabaseName(testDatabaseUrl, createDisposableDatabaseName()) : ''

describe.skipIf(!hasDatabase)('MongoDB réelle (base de test uniquement)', () => {
  beforeAll(async () => {
    assertSafeTestDatabaseUri(databaseUrl) // garde-fou : jamais une base de production
    await connectDatabase({ url: databaseUrl, requireReplicaSet: true })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it('se connecte à une base dont le nom contient « test »', () => {
    expect(mongoose.connection.readyState).toBe(1)
    assertTestDatabaseName(mongoose.connection.name)
    assertDisposableTestDatabaseName(mongoose.connection.name)
  })

  it('signale la base connectée avec transactions disponibles', async () => {
    expect(await checkDatabaseHealth()).toEqual({ status: 'connected', transactions: true })
  })

  it('ne crée pas une seconde connexion', async () => {
    const before = mongoose.connections.length
    await connectDatabase({ url: databaseUrl })
    expect(mongoose.connections.length).toBe(before)
  })

  it('exécute une transaction (annulée, sans rien écrire)', async () => {
    const session = await mongoose.connection.startSession()
    let inside = false
    await session.withTransaction(async () => {
      await mongoose.connection.db.collection('b0_probe').insertOne({ a: 1 }, { session })
      inside = true
      await session.abortTransaction()
    })
    await session.endSession()
    expect(inside).toBe(true)
  })

  it('vide la base de test via le garde-fou', async () => {
    await dropTestDatabase()
    expect(mongoose.connection.readyState).toBe(1)
  })
})

describe('garde-fous (sans MongoDB)', () => {
  it('refuse de vider une base qui ne se nomme pas « test »', () => {
    expect(() => assertTestDatabaseName('duo_capital')).toThrow()
    expect(() => assertTestDatabaseName('duo_capital_test')).not.toThrow()
  })

  it('ne vide et ne supprime que les bases temporaires au format strict', () => {
    expect(() => assertDisposableTestDatabaseName('duo_capital')).toThrow()
    expect(() => assertDisposableTestDatabaseName('duo_capital_test')).toThrow()
    expect(() => assertDisposableTestDatabaseName('autre_test_0123abcd')).toThrow()
    expect(() => assertDisposableTestDatabaseName('duo_capital_test_0123abcd')).not.toThrow()
  })

  it('refuse toute suite visant une base de production', () => {
    expect(() => assertSafeTestDatabaseUri('mongodb://127.0.0.1:27017/duo_capital')).toThrow()
  })

  it('signale clairement quand aucune base de test n’est disponible', () => {
    if (!hasDatabase) console.warn('[tests] database.test.js : tests MongoDB réels ignorés —', inject('testDatabaseError'))
    expect(typeof inject('testDatabaseSource')).toBe('string')
  })
})

describe('état de la base quand elle est déconnectée', () => {
  it('signale « disconnected » sans lever d’erreur', async () => {
    if (hasDatabase) return // la connexion peut exister dans ce worker : couvert plus haut
    expect((await checkDatabaseHealth()).status).toBe('disconnected')
  })
})
