import { randomBytes } from 'node:crypto'
import mongoose from 'mongoose'
import { isTestDatabaseName } from '../../src/config/env.js'

export const DISPOSABLE_TEST_DATABASE_NAME = /^duo_capital_test_[0-9a-f]{8}$/

export function createDisposableDatabaseName() {
  return `duo_capital_test_${randomBytes(4).toString('hex')}`
}

export function withDatabaseName(url, databaseName) {
  const match = /^(mongodb(?:\+srv)?:\/\/[^/?]+)(?:\/[^?]*)?(\?.*)?$/.exec(url)
  if (!match) throw new Error('Adresse MongoDB de test invalide.')
  return `${match[1]}/${databaseName}${match[2] ?? ''}`
}

/** Refuse toute opération si la base visée n'est pas une base de test. */
export function assertTestDatabaseName(name) {
  if (!isTestDatabaseName(name)) {
    throw new Error(`Opération refusée : « ${name} » n'est pas une base de test (le nom doit contenir « test »).`)
  }
}

/** Refuse toute opération DESTRUCTRICE si la base n'est pas une base temporaire au format strict des tests. */
export function assertDisposableTestDatabaseName(name) {
  if (typeof name !== 'string' || !DISPOSABLE_TEST_DATABASE_NAME.test(name)) {
    throw new Error(`Opération destructrice refusée : « ${name} » n'est pas une base temporaire de test (format attendu : duo_capital_test_ + 8 caractères hexadécimaux).`)
  }
}

/** Supprime la base temporaire de test actuellement connectée (refusé si son nom ne respecte pas le format strict). */
export async function dropTestDatabase() {
  assertDisposableTestDatabaseName(mongoose.connection.name)
  await mongoose.connection.dropDatabase()
}

export async function clearTestCollections() {
  assertDisposableTestDatabaseName(mongoose.connection.name)
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})))
}
