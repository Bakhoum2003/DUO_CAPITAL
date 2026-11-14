import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Démarre (une fois) la base MongoDB de test : externe via TEST_DATABASE_URL, sinon en mémoire.
    globalSetup: ['./tests/setup/globalSetup.js'],
    // Exécuté avant chaque fichier de test : verrouille l'environnement de test.
    setupFiles: ['./tests/setup/testEnv.js'],
    testTimeout: 20000,
  },
})
