import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { API_PATH_PATTERN, PWA_BACKGROUND_COLOR, PWA_MANIFEST, PWA_OPTIONS, PWA_REGISTER_MODULE, PWA_THEME_COLOR, PWA_WORKBOX, resolvePwaAlias } from '../pwa.config.js'
import { ApiError, createApiClient } from '../src/services/apiClient'
import { OFFLINE_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE, getErrorMessage } from '../src/utils/apiErrors'
import { registerSW as registerDevSW } from '../src/pwa/devRegisterStub'
import { createPwaStore, selectNotices } from '../src/pwa/pwaStore'

const root = (path) => new URL(`../${path}`, import.meta.url)
const text = (path) => readFileSync(root(path), 'utf8')

/** Largeur et hauteur d'un PNG, lues dans son en-tête IHDR. */
function pngSize(path) {
  const bytes = readFileSync(root(path))
  expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

/** Fenêtre factice : événements, navigator et matchMedia. */
function fakeWindow({ onLine = true, standalone = false, userAgent = 'Mozilla/5.0 (Linux; Android 14) Chrome/130', platform = 'Linux armv8l', maxTouchPoints = 5 } = {}) {
  const listeners = new Map()
  return {
    navigator: { onLine, userAgent, platform, maxTouchPoints },
    matchMedia: (query) => ({ matches: standalone && query === '(display-mode: standalone)' }),
    addEventListener: (type, handler) => listeners.set(type, [...(listeners.get(type) ?? []), handler]),
    removeEventListener: (type, handler) => listeners.set(type, (listeners.get(type) ?? []).filter((item) => item !== handler)),
    emit: (type, event = {}) => (listeners.get(type) ?? []).forEach((handler) => handler(event)),
    count: (type) => (listeners.get(type) ?? []).length,
  }
}

function installEvent(outcome = 'accepted') {
  return { preventDefault: vi.fn(), prompt: vi.fn(() => Promise.resolve()), userChoice: Promise.resolve({ outcome }) }
}

describe('manifeste', () => {
  it('informations de l’application', () => {
    expect(PWA_MANIFEST.name).toBe('DUO CAPITAL')
    expect(PWA_MANIFEST.short_name).toBe('DUO CAPITAL')
    expect(PWA_MANIFEST.description).toBe('Application de gestion financière commune de deux associés.')
    expect(PWA_MANIFEST.lang).toBe('fr')
    expect(PWA_MANIFEST.display).toBe('standalone')
    expect(PWA_MANIFEST.start_url).toBe('/')
    expect(PWA_MANIFEST.scope).toBe('/')
  })

  it('couleurs de la charte DUO CAPITAL (vert de marque et fond de l’application)', () => {
    expect(PWA_MANIFEST.theme_color).toBe(PWA_THEME_COLOR)
    expect(PWA_MANIFEST.background_color).toBe(PWA_BACKGROUND_COLOR)
    const css = text('src/styles/index.css')
    expect(css.includes(`--color-brand-700: ${PWA_THEME_COLOR}`)).toBe(true)
    expect(css.includes(`--color-surface: ${PWA_BACKGROUND_COLOR}`)).toBe(true)
    expect(text('index.html').includes(`<meta name="theme-color" content="${PWA_THEME_COLOR}" />`)).toBe(true)
  })

  it('icônes 192x192, 512x512 et maskable : fichiers présents aux bonnes dimensions', () => {
    const sizes = PWA_MANIFEST.icons.map((icon) => `${icon.sizes}:${icon.purpose}`)
    expect(sizes).toContain('192x192:any')
    expect(sizes).toContain('512x512:any')
    expect(sizes).toContain('512x512:maskable')
    for (const icon of PWA_MANIFEST.icons) {
      const [width, height] = icon.sizes.split('x').map(Number)
      expect(icon.type).toBe('image/png')
      expect(pngSize(`public${icon.src}`)).toEqual({ width, height })
    }
    expect(pngSize('public/apple-touch-icon.png')).toEqual({ width: 180, height: 180 })
  })

  it('métadonnées d’installation dans index.html (Apple et Android)', () => {
    const html = text('index.html')
    expect(html.includes('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />')).toBe(true)
    expect(html.includes('name="mobile-web-app-capable"')).toBe(true)
    expect(html.includes('name="apple-mobile-web-app-title" content="DUO CAPITAL"')).toBe(true)
  })
})

describe('service worker : configuration', () => {
  it('généré et enregistré automatiquement, mise à jour sur demande de l’utilisateur', () => {
    expect(PWA_OPTIONS.registerType).toBe('prompt')
    expect(PWA_OPTIONS.manifest).toBe(PWA_MANIFEST)
    expect(PWA_OPTIONS.workbox).toBe(PWA_WORKBOX)
    expect(PWA_OPTIONS.devOptions.enabled).toBe(false)
    const config = text('vite.config.js')
    expect(config.includes('VitePWA(PWA_OPTIONS)')).toBe(true)
    expect(config.includes("from 'vite-plugin-pwa'")).toBe(true)
    expect(text('src/pwa/registerServiceWorker.js').includes('registerSW(')).toBe(true)
    expect(text('src/main.jsx').includes('registerServiceWorker(pwaStore)')).toBe(true)
  })

  it('anciennes versions supprimées, pas d’activation forcée', () => {
    expect(PWA_WORKBOX.cleanupOutdatedCaches).toBe(true)
    expect(PWA_WORKBOX.skipWaiting).toBe(false)
    expect(PWA_WORKBOX.clientsClaim).toBe(false)
  })

  it('dépendance déclarée dans package.json', () => {
    const { devDependencies } = JSON.parse(text('package.json'))
    expect(Boolean(devDependencies['vite-plugin-pwa'])).toBe(true)
  })
})

describe('service worker : règles de cache (sécurité)', () => {
  it('aucun cache d’exécution : ni API, ni données, ni cookies', () => {
    expect(Object.hasOwn(PWA_WORKBOX, 'runtimeCaching')).toBe(false)
    expect(Object.hasOwn(PWA_WORKBOX, 'additionalManifestEntries')).toBe(false)
    expect(Object.hasOwn(PWA_OPTIONS, 'strategies')).toBe(false)
  })

  it('le précache ne contient que des fichiers statiques de la compilation', () => {
    expect(PWA_WORKBOX.globPatterns).toEqual(['**/*.{js,css,html,png,svg,ico,webmanifest}'])
    expect(PWA_WORKBOX.globPatterns.join(' ').includes('json')).toBe(false)
  })

  it('la page de secours de navigation ne s’applique jamais à /api', () => {
    expect(PWA_WORKBOX.navigateFallback).toBe('/index.html')
    expect(PWA_WORKBOX.navigateFallbackDenylist).toEqual([API_PATH_PATTERN])
    for (const path of ['/api', '/api/auth/me', '/api/auth/login', '/api/auth/logout', '/api/auth/refresh', '/api/v1/dashboard', '/api/v1/settings/preferences']) {
      expect(API_PATH_PATTERN.test(path)).toBe(true)
    }
    for (const path of ['/', '/dashboard', '/connexion', '/cotisations', '/apiary']) expect(API_PATH_PATTERN.test(path)).toBe(false)
  })

  it('aucun stockage navigateur ajouté par le code PWA', () => {
    for (const file of ['src/pwa/pwaStore.js', 'src/pwa/registerServiceWorker.js', 'src/hooks/usePwa.js', 'src/components/pwa/PwaNotices.jsx']) {
      expect(/localStorage|sessionStorage|indexedDB|caches\./.test(text(file))).toBe(false)
    }
  })
})

describe('installation', () => {
  it('Chrome / Edge / Android : l’invitation apparaît, puis l’installation native se lance', async () => {
    const win = fakeWindow()
    const store = createPwaStore({ win })
    store.init()
    expect(selectNotices(store.getState()).install).toBe(false)

    const event = installEvent('accepted')
    win.emit('beforeinstallprompt', event)
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(selectNotices(store.getState()).install).toBe(true)

    expect(await store.promptInstall()).toEqual({ outcome: 'accepted' })
    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect(selectNotices(store.getState()).install).toBe(false)
    // L'événement n'est utilisable qu'une fois.
    expect(await store.promptInstall()).toEqual({ outcome: 'unavailable' })
  })

  it('installation refusée par l’utilisateur', async () => {
    const win = fakeWindow()
    const store = createPwaStore({ win })
    store.init()
    win.emit('beforeinstallprompt', installEvent('dismissed'))
    expect(await store.promptInstall()).toEqual({ outcome: 'dismissed' })
  })

  it('application déjà installée (fenêtre autonome) : aucun bouton', () => {
    const win = fakeWindow({ standalone: true })
    const store = createPwaStore({ win })
    store.init()
    win.emit('beforeinstallprompt', installEvent())
    expect(store.getState().isInstalled).toBe(true)
    expect(selectNotices(store.getState())).toEqual({ offline: false, update: false, install: false, manualInstall: false })
  })

  it('l’événement « appinstalled » retire le bouton', () => {
    const win = fakeWindow()
    const store = createPwaStore({ win })
    store.init()
    win.emit('beforeinstallprompt', installEvent())
    expect(selectNotices(store.getState()).install).toBe(true)
    win.emit('appinstalled')
    expect(store.getState().isInstalled).toBe(true)
    expect(selectNotices(store.getState()).install).toBe(false)
  })

  it('navigateur sans installation native (Firefox, etc.) : aucun bouton', async () => {
    const store = createPwaStore({ win: fakeWindow({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0', platform: 'Linux x86_64', maxTouchPoints: 0 }) })
    store.init()
    expect(selectNotices(store.getState())).toEqual({ offline: false, update: false, install: false, manualInstall: false })
    expect(await store.promptInstall()).toEqual({ outcome: 'unavailable' })
  })

  it('iPhone / iPad : explication manuelle (Partager > Sur l’écran d’accueil), masquable', () => {
    const win = fakeWindow({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1', platform: 'iPhone' })
    const store = createPwaStore({ win })
    store.init()
    expect(selectNotices(store.getState())).toEqual({ offline: false, update: false, install: false, manualInstall: true })
    store.dismissInstall()
    expect(selectNotices(store.getState()).manualInstall).toBe(false)
  })

  it('l’invitation peut être masquée pour la session', () => {
    const win = fakeWindow()
    const store = createPwaStore({ win })
    store.init()
    win.emit('beforeinstallprompt', installEvent())
    store.dismissInstall()
    expect(selectNotices(store.getState()).install).toBe(false)
  })

  it('init est idempotent et la fonction d’arrêt retire les écouteurs', () => {
    const win = fakeWindow()
    const store = createPwaStore({ win })
    const stop = store.init()
    store.init()
    expect(win.count('online')).toBe(1)
    stop()
    expect(win.count('online')).toBe(0)
    expect(win.count('beforeinstallprompt')).toBe(0)
  })
})

describe('mises à jour', () => {
  it('une nouvelle version est signalée, sans jamais s’appliquer d’elle-même', () => {
    const store = createPwaStore({ win: fakeWindow() })
    const apply = vi.fn(() => Promise.resolve())
    expect(selectNotices(store.getState()).update).toBe(false)
    store.markUpdateAvailable(apply)
    expect(selectNotices(store.getState()).update).toBe(true)
    expect(apply).toHaveBeenCalledTimes(0)
  })

  it('« Actualiser » applique la mise à jour une seule fois par appel', async () => {
    const store = createPwaStore({ win: fakeWindow() })
    const apply = vi.fn(() => Promise.resolve())
    store.markUpdateAvailable(apply)
    expect(await store.applyUpdate()).toEqual({ applied: true })
    expect(apply).toHaveBeenCalledTimes(1)
  })

  it('« Plus tard » masque la notice sans rien appliquer', () => {
    const store = createPwaStore({ win: fakeWindow() })
    const apply = vi.fn(() => Promise.resolve())
    store.markUpdateAvailable(apply)
    store.dismissUpdate()
    expect(selectNotices(store.getState()).update).toBe(false)
    expect(apply).toHaveBeenCalledTimes(0)
  })

  it('sans mise à jour en attente, appliquer ne fait rien', async () => {
    const store = createPwaStore({ win: fakeWindow() })
    expect(await store.applyUpdate()).toEqual({ applied: false })
  })

  it('le service worker n’est pas activé automatiquement et l’utilisateur est prévenu', () => {
    const register = text('src/pwa/registerServiceWorker.js')
    expect(register.includes('store.markUpdateAvailable(() => updateSW(true))')).toBe(true)
    expect(text('src/components/pwa/PwaNotices.jsx').includes('Terminez votre saisie en cours')).toBe(true)
  })

  it('abonnés notifiés à chaque changement', () => {
    const store = createPwaStore({ win: fakeWindow() })
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.markUpdateAvailable(() => {})
    store.dismissUpdate()
    unsubscribe()
    store.markOfflineReady()
    expect(listener).toHaveBeenCalledTimes(2)
  })
})

describe('hors connexion', () => {
  it('le bandeau suit les événements online / offline', () => {
    const win = fakeWindow()
    const store = createPwaStore({ win })
    store.init()
    expect(selectNotices(store.getState()).offline).toBe(false)
    win.emit('offline')
    expect(selectNotices(store.getState()).offline).toBe(true)
    win.emit('online')
    expect(selectNotices(store.getState()).offline).toBe(false)
  })

  it('démarrage hors connexion : bandeau immédiat', () => {
    const store = createPwaStore({ win: fakeWindow({ onLine: false }) })
    expect(selectNotices(store.getState()).offline).toBe(true)
  })

  it('message clair pour l’accès aux données hors connexion', () => {
    const networkError = { code: 'NETWORK_ERROR', status: 0 }
    const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
    try {
      Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true })
      expect(getErrorMessage(networkError)).toBe(OFFLINE_ERROR_MESSAGE)
      Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })
      expect(getErrorMessage(networkError)).toBe(NETWORK_ERROR_MESSAGE)
    } finally {
      if (original) Object.defineProperty(globalThis, 'navigator', original)
      else delete globalThis.navigator
    }
    expect(OFFLINE_ERROR_MESSAGE.includes('rien n\'a été enregistré')).toBe(true)
  })

  it('une opération hors connexion échoue toujours : aucune réussite simulée', async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
    const client = createApiClient({ baseUrl: '', fetchImpl })
    const error = await client.request('/api/v1/contributions', { method: 'POST', body: { amount: 15000 } }).catch((caught) => caught)
    expect(error instanceof ApiError).toBe(true)
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.status).toBe(0)
    // Aucune réponse de repli : la requête est tentée une seule fois et ne passe par aucun cache.
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl.mock.calls[0][1].cache).toBe('no-store')
  })

  it('les notices PWA sont branchées dans les deux mises en page', () => {
    expect(text('src/layouts/DashboardLayout.jsx').includes('<PwaNotices')).toBe(true)
    expect(text('src/layouts/AuthLayout.jsx').includes('<PwaNotices')).toBe(true)
  })
})

describe('module virtuel « virtual:pwa-register »', () => {
  it('développement : redirigé vers un remplaçant sans effet (le serveur ne dépend pas du module virtuel)', () => {
    expect(PWA_REGISTER_MODULE).toBe('virtual:pwa-register')
    expect(resolvePwaAlias('serve', '/projet/src/pwa/devRegisterStub.js')).toEqual({ 'virtual:pwa-register': '/projet/src/pwa/devRegisterStub.js' })
  })

  it('production : aucun alias, le vrai module du plugin est utilisé', () => {
    expect(resolvePwaAlias('build', '/projet/src/pwa/devRegisterStub.js')).toEqual({})
  })

  it('le remplaçant enregistre aucun service worker et garde la signature du module réel', async () => {
    const update = registerDevSW({ onNeedRefresh: () => {} })
    expect(typeof update).toBe('function')
    expect(await update(true)).toBeUndefined()
    const stub = text('src/pwa/devRegisterStub.js')
    expect(/navigator\.serviceWorker|workbox/.test(stub)).toBe(false)
  })

  it('vite.config.js : plugin enregistré, alias appliqué selon la commande, enregistrement seulement en production', () => {
    const config = text('vite.config.js')
    expect(config.includes('VitePWA(PWA_OPTIONS)')).toBe(true)
    expect(config.includes('defineConfig(({ command, mode }) =>')).toBe(true)
    expect(config.includes('resolvePwaAlias(command,')).toBe(true)
    expect(text('src/pwa/registerServiceWorker.js').includes("from 'virtual:pwa-register'")).toBe(true)
    expect(text('src/main.jsx').includes('if (import.meta.env.PROD) registerServiceWorker(pwaStore)')).toBe(true)
    // La configuration de sécurité du cache est inchangée.
    expect(Object.hasOwn(PWA_WORKBOX, 'runtimeCaching')).toBe(false)
  })
})
