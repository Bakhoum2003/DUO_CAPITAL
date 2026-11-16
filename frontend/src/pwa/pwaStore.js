// Aucun stockage navigateur ni cache : tout reste en mémoire, rien de financier n'est conservé.

export function isStandaloneDisplay(win) {
  if (!win) return false
  if (win.navigator?.standalone === true) return true // Safari iOS
  return Boolean(win.matchMedia?.('(display-mode: standalone)')?.matches)
}

export function needsManualInstallHelp(win) {
  const nav = win?.navigator
  if (!nav) return false
  const isIosDevice = /iphone|ipad|ipod/i.test(nav.userAgent ?? '') || (nav.platform === 'MacIntel' && Number(nav.maxTouchPoints) > 1)
  return isIosDevice && !isStandaloneDisplay(win)
}

function initialState(win) {
  const isInstalled = isStandaloneDisplay(win)
  return {
    isOnline: win?.navigator?.onLine !== false,
    isInstalled,
    canInstall: false, // devient vrai à la réception de « beforeinstallprompt » (Chrome, Edge, Android)
    showManualInstallHelp: !isInstalled && needsManualInstallHelp(win),
    installDismissed: false,
    updateAvailable: false,
    offlineReady: false,
  }
}

/**
 * Notices à afficher, déduites de l'état (fonction pure).
 * - offline : bandeau de connexion perdue ;
 * - update : nouvelle version disponible ;
 * - install : bouton d'installation native (jamais si déjà installée ou invitation refusée) ;
 * - manualInstall : explication pour les navigateurs sans installation native (iOS).
 */
export function selectNotices(state) {
  const canPromptInstall = !state.isInstalled && !state.installDismissed
  return {
    offline: !state.isOnline,
    update: state.updateAvailable,
    install: canPromptInstall && state.canInstall,
    manualInstall: canPromptInstall && !state.canInstall && state.showManualInstallHelp,
  }
}

/**
 * @param {{ win?: Window, unsavedChanges?: ReturnType<import('./unsavedChangesStore').createUnsavedChangesStore> }} [options]
 *   fenêtre et suivi des saisies non enregistrées, remplaçables dans les tests. Sans suivi, aucune garde n'est appliquée.
 */
export function createPwaStore({ win = typeof window !== 'undefined' ? window : undefined, unsavedChanges } = {}) {
  let state = initialState(win)
  let deferredPrompt = null
  let applyUpdateFn = null
  let cleanup = null
  const listeners = new Set()

  const setState = (patch) => {
    state = { ...state, ...patch }
    listeners.forEach((listener) => listener())
  }

  const store = {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    getState: () => state,

    /** Écoute la fenêtre (connexion, installation). Idempotent ; retourne la fonction d'arrêt. */
    init() {
      if (cleanup || !win?.addEventListener) return () => {}

      const onOnline = () => setState({ isOnline: true })
      const onOffline = () => setState({ isOnline: false })
      const onBeforeInstallPrompt = (event) => {
        event.preventDefault()
        deferredPrompt = event
        if (!state.isInstalled) setState({ canInstall: true })
      }
      const onAppInstalled = () => {
        deferredPrompt = null
        setState({ isInstalled: true, canInstall: false, showManualInstallHelp: false })
      }

      win.addEventListener('online', onOnline)
      win.addEventListener('offline', onOffline)
      win.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      win.addEventListener('appinstalled', onAppInstalled)
      setState({ isOnline: win.navigator?.onLine !== false })

      cleanup = () => {
        win.removeEventListener('online', onOnline)
        win.removeEventListener('offline', onOffline)
        win.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
        win.removeEventListener('appinstalled', onAppInstalled)
        cleanup = null
      }
      return cleanup
    },

    async promptInstall() {
      const prompt = deferredPrompt
      if (!prompt) return { outcome: 'unavailable' }
      deferredPrompt = null
      setState({ canInstall: false })
      await prompt.prompt()
      const choice = await prompt.userChoice
      return { outcome: choice?.outcome === 'accepted' ? 'accepted' : 'dismissed' }
    },

    /** Masque l'invitation d'installation pour cette session (en mémoire uniquement). */
    dismissInstall() {
      setState({ installDismissed: true })
    },

    markUpdateAvailable(apply) {
      applyUpdateFn = typeof apply === 'function' ? apply : null
      setState({ updateAvailable: true })
    },

    markOfflineReady() {
      setState({ offlineReady: true })
    },

    /**
     * Applique la nouvelle version, uniquement sur demande de l'utilisateur (jamais automatiquement).
     * Si des saisies ne sont pas enregistrées, rien n'est appliqué et { applied: false, blocked: true } est retourné :
     * l'interface demande alors une confirmation, puis rappelle applyUpdate({ discardUnsaved: true }).
     */
    async applyUpdate({ discardUnsaved = false } = {}) {
      if (!applyUpdateFn) return { applied: false }
      const hasUnsaved = Boolean(unsavedChanges?.hasUnsavedChanges())
      if (hasUnsaved && !discardUnsaved) return { applied: false, blocked: true }

      const restoreGuard = hasUnsaved ? unsavedChanges.allowUnload() : null
      try {
        await applyUpdateFn()
      } catch (error) {
        restoreGuard?.() // la mise à jour a échoué : la page reste, la protection aussi
        throw error
      }
      return { applied: true }
    },

    dismissUpdate() {
      setState({ updateAvailable: false })
    },
  }

  return store
}
