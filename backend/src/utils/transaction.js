import mongoose from 'mongoose'

/**
 * Exécute `work(dbSession)` dans une transaction MongoDB (réessayée automatiquement en cas de conflit transitoire).
 * Exige un replica set (Atlas en est un ; en local, voir README).
 */
export function runInTransaction(work) {
  return mongoose.connection.transaction(work)
}
