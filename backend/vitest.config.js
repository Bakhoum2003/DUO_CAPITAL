import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    globalSetup: ['./tests/setup/globalSetup.js'],
    // Exécuté avant chaque fichier de test : verrouille l'environnement de test.
    setupFiles: ['./tests/setup/testEnv.js'],
    testTimeout: 20000,
  },
})
