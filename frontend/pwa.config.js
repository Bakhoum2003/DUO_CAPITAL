

export const PWA_THEME_COLOR = '#0b6a2e' 
export const PWA_BACKGROUND_COLOR = '#f6f9f7' 

export const PWA_MANIFEST = {
  id: '/',
  name: 'DUO CAPITAL',
  short_name: 'DUO CAPITAL',
  description: 'Application de gestion financière commune de deux associés.',
  lang: 'fr',
  dir: 'ltr',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'any',
  theme_color: PWA_THEME_COLOR,
  background_color: PWA_BACKGROUND_COLOR,
  categories: ['finance', 'business'],
  icons: [
    { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}

export const API_PATH_PATTERN = /^\/api(\/|$)/

export const PWA_WORKBOX = {
  // Précache : fichiers statiques de la compilation uniquement.
  globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [API_PATH_PATTERN],
  cleanupOutdatedCaches: true,
  skipWaiting: false,
  clientsClaim: false,
}

export const PWA_OPTIONS = {
  registerType: 'prompt',
  injectRegister: false, // l'enregistrement est fait par src/pwa/registerServiceWorker.js
  includeAssets: ['favicon.png', 'favicon.svg', 'apple-touch-icon.png'],
  manifest: PWA_MANIFEST,
  workbox: PWA_WORKBOX,
  devOptions: { enabled: false },
}

export const PWA_REGISTER_MODULE = 'virtual:pwa-register'

/**
 *
 *
 * @param {string} command 
 * @param {string} stubPath 
 */
export function resolvePwaAlias(command, stubPath) {
  if (command !== 'serve' || PWA_OPTIONS.devOptions.enabled) return {}
  return { [PWA_REGISTER_MODULE]: stubPath }
}
