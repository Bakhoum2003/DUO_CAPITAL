// Configuration PWA de DUO CAPITAL, isolée de vite.config.js pour pouvoir être vérifiée par les tests.
// Règle de sécurité centrale : le service worker ne met en cache QUE les fichiers statiques de l'application
// (HTML, JavaScript, CSS, images de la compilation). Aucune requête d'API, aucune donnée d'associé ni donnée
// financière, aucun cookie ni jeton ne passe par un cache : il n'y a volontairement aucun « runtimeCaching ».

export const PWA_THEME_COLOR = '#0b6a2e' // vert de marque (brand-700), identique à <meta name="theme-color">
export const PWA_BACKGROUND_COLOR = '#f6f9f7' // fond de l'application (surface)

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

// Les routes de l'API ne sont jamais servies depuis le cache, même par la page de secours de navigation.
export const API_PATH_PATTERN = /^\/api(\/|$)/

export const PWA_WORKBOX = {
  // Précache : fichiers statiques de la compilation uniquement.
  globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
  // Page de secours pour la navigation interne (React Router) ; jamais pour l'API.
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [API_PATH_PATTERN],
  // Anciennes versions supprimées à l'activation ; la nouvelle version attend l'accord de l'utilisateur
  // (pas de skipWaiting automatique) pour ne pas interrompre une opération en cours.
  cleanupOutdatedCaches: true,
  skipWaiting: false,
  clientsClaim: false,
  // Aucun runtimeCaching : voir l'en-tête de ce fichier.
}

export const PWA_OPTIONS = {
  registerType: 'prompt',
  injectRegister: false, // l'enregistrement est fait par src/pwa/registerServiceWorker.js
  includeAssets: ['favicon.png', 'favicon.svg', 'apple-touch-icon.png'],
  manifest: PWA_MANIFEST,
  workbox: PWA_WORKBOX,
  devOptions: { enabled: false },
}

// Module virtuel du plugin importé par src/pwa/registerServiceWorker.js.
export const PWA_REGISTER_MODULE = 'virtual:pwa-register'

/**
 * Alias Vite à appliquer selon la commande (« serve » = développement et aperçu, « build » = production).
 * - Développement : le service worker est désactivé (devOptions.enabled = false) ; « virtual:pwa-register » est donc
 *   redirigé vers un remplaçant sans effet (src/pwa/devRegisterStub.js). Le serveur démarre sans dépendre de la
 *   résolution du module virtuel et aucun service worker n'est enregistré.
 * - Production, ou développement avec service worker activé : aucun alias, le vrai module de vite-plugin-pwa est utilisé.
 *
 * @param {string} command commande Vite ('serve' ou 'build')
 * @param {string} stubPath chemin absolu du remplaçant
 */
export function resolvePwaAlias(command, stubPath) {
  if (command !== 'serve' || PWA_OPTIONS.devOptions.enabled) return {}
  return { [PWA_REGISTER_MODULE]: stubPath }
}
