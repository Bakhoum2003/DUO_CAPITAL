import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { PWA_OPTIONS, resolvePwaAlias } from './pwa.config.js'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // En développement, le navigateur appelle « /api/... » sur l'adresse du frontend et Vite relaie vers le backend :
  // une seule origine, donc pas de CORS et les cookies de session restent des cookies « même site ».
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:4000'

  return {
    plugins: [react(), tailwindcss(), VitePWA(PWA_OPTIONS)],
    // « virtual:pwa-register » : module virtuel réel en production, remplaçant sans effet en développement.
    resolve: { alias: resolvePwaAlias(command, fileURLToPath(new URL('./src/pwa/devRegisterStub.js', import.meta.url))) },
    server: {
      proxy: { '/api': { target: apiTarget } },
    },
  }
})
