
/**
 * @returns {{
 *   register: () => { setDirty: (isDirty: boolean) => void, unregister: () => void },
 *   hasUnsavedChanges: () => boolean,
 *   shouldBlockUnload: () => boolean,
 *   allowUnload: () => () => void,
 *   getCount: () => number,
 *   subscribe: (listener: () => void) => () => void,
 * }}
 */
export function createUnsavedChangesStore() {
  const entries = new Map() // clé unique d'inscription -> modifié ?
  const listeners = new Set()
  let nextKey = 0
  let dirtyCount = 0
  let unloadAllowed = false

  const notify = () => listeners.forEach((listener) => listener())

  return {
    /** Inscrit un formulaire (propre au départ). Retourne ses deux actions ; unregister est idempotent. */
    register() {
      const key = nextKey
      nextKey += 1
      entries.set(key, false)

      return {
        setDirty(isDirty) {
          if (!entries.has(key)) return // formulaire déjà désinscrit : aucun état périmé
          const next = Boolean(isDirty)
          if (entries.get(key) === next) return
          entries.set(key, next)
          dirtyCount += next ? 1 : -1
          notify()
        },
        unregister() {
          if (!entries.has(key)) return
          const wasDirty = entries.get(key)
          entries.delete(key)
          if (wasDirty) {
            dirtyCount -= 1
            notify()
          }
        },
      }
    },

    hasUnsavedChanges: () => dirtyCount > 0,

    shouldBlockUnload: () => dirtyCount > 0 && !unloadAllowed,

    allowUnload() {
      unloadAllowed = true
      notify()
      return () => {
        unloadAllowed = false
        notify()
      }
    },

    getCount: () => dirtyCount,

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export function createFormBinding(store) {
  let handle = null
  return {
    attach() {
      if (!handle) handle = store.register()
    },
    sync(isDirty) {
      handle?.setDirty(isDirty)
    },
    release() {
      handle?.unregister()
      handle = null
    },
  }
}

export function attachBeforeUnloadGuard(store, win = typeof window !== 'undefined' ? window : undefined) {
  if (!win?.addEventListener) return () => {}
  let isAttached = false

  const handler = (event) => {
    if (!store.shouldBlockUnload()) return undefined
    event.preventDefault()
    event.returnValue = '' // requis par certains navigateurs
    return ''
  }

  const sync = () => {
    const needed = store.shouldBlockUnload()
    if (needed && !isAttached) {
      win.addEventListener('beforeunload', handler)
      isAttached = true
    } else if (!needed && isAttached) {
      win.removeEventListener('beforeunload', handler)
      isAttached = false
    }
  }

  const unsubscribe = store.subscribe(sync)
  sync()

  return () => {
    unsubscribe()
    if (isAttached) {
      win.removeEventListener('beforeunload', handler)
      isAttached = false
    }
  }
}
