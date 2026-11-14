import mongoose from 'mongoose'
import { isTestDatabaseName } from '../../src/config/env.js'

/** Refuse toute opération destructrice si la base visée n'est pas une base de test. */
export function assertTestDatabaseName(name) {
  if (!isTestDatabaseName(name)) {
    throw new Error(`Opération refusée : « ${name} » n'est pas une base de test (le nom doit contenir « test »).`)
  }
}

/** Vide la base de test actuellement connectée (refusé si ce n'est pas une base de test). */
export async function dropTestDatabase() {
  assertTestDatabaseName(mongoose.connection.name)
  await mongoose.connection.dropDatabase()
}

/** Supprime tous les documents de la base de test connectée (garde-fou : le nom doit contenir « test »). */
export async function clearTestCollections() {
  assertTestDatabaseName(mongoose.connection.name)
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})))
}
