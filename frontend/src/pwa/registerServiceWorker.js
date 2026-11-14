import { registerSW } from 'virtual:pwa-register'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * Enregistre le service worker (généré par vite-plugin-pwa) et relie ses événements au store PWA.
 * Mode « prompt » : une nouvelle version est signalée mais n'est activée que lorsque l'utilisateur clique
 * sur « Actualiser » ; une saisie ou une opération en cours n'est jamais interrompue.
 */
export function registerServiceWorker(store) {
  const updateSW = registerSW({
    onNeedRefresh() {
      store.markUpdateAvailable(() => updateSW(true))
    },
    onOfflineReady() {
      store.markOfflineReady()
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Recherche périodique d'une nouvelle version (uniquement si le navigateur est en ligne).
      setInterval(() => {
        if (registration.installing || navigator.onLine === false) return
        registration.update().catch(() => {})
      }, UPDATE_CHECK_INTERVAL_MS)
    },
  })
}
