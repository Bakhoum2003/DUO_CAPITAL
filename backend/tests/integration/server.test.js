import { afterEach, describe, expect, it } from 'vitest'
import { startServer } from '../../src/server.js'
import { createLogger } from '../../src/utils/logger.js'
import { createFakeDatabase } from '../helpers/fakeDatabase.js'
import { buildTestConfig } from '../helpers/testConfig.js'

const logger = createLogger({ level: 'silent', environment: 'test' })
const running = []

afterEach(async () => {
  while (running.length) await running.pop()('cleanup')
})

async function start(database, port = 0) {
  const config = { ...buildTestConfig(), port }
  const instance = await startServer({ config, logger, database })
  running.push(instance.shutdown)
  return instance
}

describe('cycle de vie du serveur (base factice)', () => {
  it("se connecte à la base AVANT d'écouter, puis répond", async () => {
    const database = createFakeDatabase()
    const { port } = await start(database)
    expect(database.events).toEqual(['connect'])
    const res = await fetch(`http://127.0.0.1:${port}/api/health`)
    expect(res.status).toBe(200)
  })

  it('ne démarre pas si la base est injoignable', async () => {
    const database = createFakeDatabase({ connectError: new Error('base absente') })
    await expect(startServer({ config: { ...buildTestConfig(), port: 0 }, logger, database })).rejects.toThrow('base absente')
    expect(database.events).toEqual(['connect'])
  })

  it('ferme le serveur puis la base, et ne se ferme qu\'une fois', async () => {
    const database = createFakeDatabase()
    const { server, shutdown } = await start(database)
    await Promise.all([shutdown('SIGTERM'), shutdown('SIGINT')])
    expect(server.listening).toBe(false)
    expect(database.events).toEqual(['connect', 'disconnect'])
  })

  it("referme la base si le port d'écoute est déjà pris", async () => {
    const first = createFakeDatabase()
    const { port } = await start(first)
    const second = createFakeDatabase()
    await expect(startServer({ config: { ...buildTestConfig(), port }, logger, database: second })).rejects.toThrow()
    expect(second.events).toEqual(['connect', 'disconnect'])
  })
})
