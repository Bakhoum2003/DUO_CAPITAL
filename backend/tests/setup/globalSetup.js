// Prépare UNE base MongoDB de test pour toute la suite (compatible transactions : replica set).
//
// 1. Si TEST_DATABASE_URL est définie (environnement ou backend/.env), elle est utilisée après contrôle
//    de sécurité : son nom doit contenir « test ». Sinon la suite entière est refusée.
//    Le fichier .env n'est lu que pour cette variable : DATABASE_URL n'est jamais chargée dans les tests.
// 2. Sinon, une base temporaire est démarrée en mémoire (mongodb-memory-server, replica set à 1 nœud).
//    Au premier lancement, le binaire MongoDB est téléchargé (connexion Internet nécessaire).
// 3. Si aucune base n'est disponible, les tests qui ont besoin d'une vraie base sont IGNORÉS (et signalés).
//    REQUIRE_DB_TESTS=1 les rend obligatoires : la suite échoue au lieu de les ignorer.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { assertSafeTestDatabaseUri } from '../../src/config/env.js'

const ENV_FILE_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env')

function readTestDatabaseUrlFromEnvFile() {
  try {
    return dotenv.parse(fs.readFileSync(ENV_FILE_PATH)).TEST_DATABASE_URL
  } catch {
    return undefined
  }
}

export default async function setup({ provide }) {
  const explicitUrl = (process.env.TEST_DATABASE_URL || readTestDatabaseUrlFromEnvFile() || '').trim()

  if (explicitUrl) {
    assertSafeTestDatabaseUri(explicitUrl) // lève une erreur : toute la suite est refusée
    provide('testDatabaseUrl', explicitUrl)
    provide('testDatabaseSource', 'TEST_DATABASE_URL')
    provide('testDatabaseError', '')
    return undefined
  }

  try {
    const { MongoMemoryReplSet } = await import('mongodb-memory-server')
    const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    const url = replSet.getUri('duo_capital_test')
    assertSafeTestDatabaseUri(url)
    provide('testDatabaseUrl', url)
    provide('testDatabaseSource', 'memory')
    provide('testDatabaseError', '')
    return async () => {
      await replSet.stop()
    }
  } catch (err) {
    if (process.env.REQUIRE_DB_TESTS === '1') throw err

    const reason = String(err?.message ?? err)
    console.warn(`\n[tests] Aucune base MongoDB de test disponible : les tests d'intégration MongoDB seront IGNORÉS.\n[tests] Cause : ${reason}\n`)
    provide('testDatabaseUrl', '')
    provide('testDatabaseSource', 'unavailable')
    provide('testDatabaseError', reason)
    return undefined
  }
}
