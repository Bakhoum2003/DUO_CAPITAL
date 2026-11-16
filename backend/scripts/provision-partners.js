
import { pathToFileURL } from 'node:url'
import mongoose from 'mongoose'
import { ConfigError, loadDotenv, parseEnv } from '../src/config/env.js'
import { connectDatabase, disconnectDatabase } from '../src/config/database.js'
import { createLogger } from '../src/utils/logger.js'

async function main() {
  const args = process.argv.slice(2)
  const unknown = args.filter((arg) => arg !== '--dry-run')
  if (unknown.length > 0) {
    console.error(`Option inconnue : ${unknown.join(' ')}. Seule --dry-run est acceptée.`)
    process.exit(2)
  }
  const dryRun = args.includes('--dry-run')

  loadDotenv()
  let config
  try {
    config = parseEnv(process.env)
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message)
      process.exit(1)
    }
    throw err
  }
  if (config.env === 'test') {
    console.error('Refusé : environnement de test.')
    process.exit(1)
  }

  mongoose.set('autoIndex', !dryRun) // la simulation ne crée même pas d'index
  const { runProvisioning, ProvisioningAborted } = await import('./lib/runProvisioning.js')
  const { createTerminalIo } = await import('./lib/terminalIo.js')
  const io = createTerminalIo()
  const logger = createLogger({ level: 'silent', environment: config.env })

  let exitCode = 0
  try {
    await connectDatabase({ url: config.database.url, requireReplicaSet: true, logger })
    await runProvisioning({ config, io, dryRun })
  } catch (err) {
    exitCode = 1
    console.error(err instanceof ProvisioningAborted || err?.code ? `Échec : ${err.message}` : 'Échec inattendu.')
  } finally {
    io.close()
    await disconnectDatabase().catch(() => {})
  }
  process.exit(exitCode)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
