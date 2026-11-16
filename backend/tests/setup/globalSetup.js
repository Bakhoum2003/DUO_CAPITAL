// Prépare UNE base MongoDB de test pour toute la suite (compatible transactions : replica set).
// 1. Si TEST_DATABASE_URL est définie (environnement ou backend/.env), elle est utilisée après contrôle de sécurité :
//    son nom de base doit contenir « test » et elle ne doit pas désigner la même base que DATABASE_URL. Sinon toute la suite est refusée.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { checkTestDatabaseReachable, resolveTestDatabase, startMemoryDatabase } from './testDatabaseResolver.js'

const ENV_FILE_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env')

function readEnvFileValues() {
  try {
    const parsed = dotenv.parse(fs.readFileSync(ENV_FILE_PATH))
    return { TEST_DATABASE_URL: parsed.TEST_DATABASE_URL, DATABASE_URL: parsed.DATABASE_URL }
  } catch {
    return {}
  }
}

export default async function setup({ provide }) {
  const database = await resolveTestDatabase({
    env: process.env,
    envFile: readEnvFileValues(),
    startMemoryDatabase,
    checkReachable: checkTestDatabaseReachable,
  })

  if (database.source === 'unavailable') {
    console.warn(`\n[tests] Aucune base MongoDB de test disponible : les tests d'intégration MongoDB seront IGNORÉS (REQUIRE_DB_TESTS=1 les rend obligatoires).\n[tests] Cause : ${database.error}\n`)
  }

  provide('testDatabaseUrl', database.url)
  provide('testDatabaseSource', database.source)
  provide('testDatabaseError', database.error)

  const { stop } = database
  return stop ? async () => stop() : undefined
}
