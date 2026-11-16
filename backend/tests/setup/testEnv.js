// Exécuté avant chaque fichier de test : verrouille l'environnement.
import { inject } from 'vitest'
import { isStrictMode } from './testDatabaseResolver.js'

process.env.NODE_ENV = 'test'
delete process.env.DATABASE_URL

if (isStrictMode(process.env) && !inject('testDatabaseUrl')) {
  throw new Error("REQUIRE_DB_TESTS=1 : aucune base de test n'a été fournie, les tests d'intégration ne peuvent pas être ignorés.")
}
