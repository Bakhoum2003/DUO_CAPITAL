import mongoose from 'mongoose'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { connectDatabase } from '../../src/config/database.js'

vi.mock('mongoose', () => {
  const connection = {
    readyState: 0,
    on() {},
    asPromise: async () => connection,
    db: { admin: () => ({ command: async () => ({ setName: 'rs0' }), ping: async () => ({ ok: 1 }) }) },
  }
  const connect = vi.fn(async () => {
    connection.readyState = 1
  })
  const disconnect = vi.fn(async () => {
    connection.readyState = 0
  })
  return { default: { connection, connect, disconnect, set() {} } }
})

const DB_URL = 'mongodb://127.0.0.1:27017/duo_capital_dev?replicaSet=rs0'

beforeEach(() => {
  mongoose.connection.readyState = 0
  mongoose.connect.mockClear()
  mongoose.disconnect.mockClear()
})

describe('connectDatabase : pool et idempotence', () => {
  it('utilise 10 connexions au maximum par défaut', async () => {
    await connectDatabase({ url: DB_URL })
    expect(mongoose.connect).toHaveBeenCalledTimes(1)
    expect(mongoose.connect.mock.calls[0][1]).toMatchObject({ maxPoolSize: 10, serverSelectionTimeoutMS: 5000 })
  })

  it('applique la taille de pool demandée (ex. 5 en production serverless)', async () => {
    await connectDatabase({ url: DB_URL, maxPoolSize: 5 })
    expect(mongoose.connect.mock.calls[0][1].maxPoolSize).toBe(5)
  })

  it('ne rouvre jamais une connexion déjà ouverte et ne la ferme pas', async () => {
    await connectDatabase({ url: DB_URL, maxPoolSize: 5 })
    await connectDatabase({ url: DB_URL, maxPoolSize: 5 })
    await connectDatabase({ url: DB_URL })
    expect(mongoose.connect).toHaveBeenCalledTimes(1)
    expect(mongoose.disconnect).not.toHaveBeenCalled()
  })
})
