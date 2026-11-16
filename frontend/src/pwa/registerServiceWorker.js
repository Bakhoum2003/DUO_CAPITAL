import { registerSW } from 'virtual:pwa-register'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

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
