import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { attachBeforeUnloadGuard, createFormBinding, createUnsavedChangesStore } from '../src/pwa/unsavedChangesStore'
import { createPwaStore, selectNotices } from '../src/pwa/pwaStore'
import { areFormValuesDirty } from '../src/utils/formDirty'
import UnsavedUpdateDialog from '../src/components/pwa/UnsavedUpdateDialog'

const text = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

function fakeWindow() {
  const listeners = new Map()
  return {
    navigator: { onLine: true, userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/130', platform: 'Linux', maxTouchPoints: 5 },
    matchMedia: () => ({ matches: false }),
    addEventListener: (type, handler) => listeners.set(type, [...(listeners.get(type) ?? []), handler]),
    removeEventListener: (type, handler) => listeners.set(type, (listeners.get(type) ?? []).filter((item) => item !== handler)),
    emit(type, event) {
      ;(listeners.get(type) ?? []).forEach((handler) => handler(event))
      return event
    },
    count: (type) => (listeners.get(type) ?? []).length,
  }
}
const beforeUnloadEvent = () => ({ preventDefault: vi.fn(), returnValue: undefined })

describe('areFormValuesDirty', () => {
  it('formulaire inchangé : propre', () => {
    expect(areFormValuesDirty({ amount: '', note: '' }, { amount: '', note: '' })).toBe(false)
    expect(areFormValuesDirty({ amount: '5000' }, { amount: '5000' })).toBe(false)
  })
  it('un champ modifié rend le formulaire sale, y compris effacé', () => {
    expect(areFormValuesDirty({ amount: '5000' }, { amount: '' })).toBe(true)
    expect(areFormValuesDirty({ amount: '' }, { amount: '5000' })).toBe(true)
  })
  it('retour à la valeur de départ : propre à nouveau ; champ absent = champ vide', () => {
    expect(areFormValuesDirty({ amount: '10' }, { amount: '' })).toBe(true)
    expect(areFormValuesDirty({ amount: '' }, { amount: '' })).toBe(false)
    expect(areFormValuesDirty({ a: '1' }, { a: '1', b: '' })).toBe(false)
    expect(areFormValuesDirty(undefined, undefined)).toBe(false)
  })
})

describe('unsavedChangesStore', () => {
  it('aucun formulaire ou formulaire propre : aucune modification non enregistrée', () => {
    const store = createUnsavedChangesStore()
    expect(store.hasUnsavedChanges()).toBe(false)
    const form = store.register()
    expect(store.hasUnsavedChanges()).toBe(false)
    form.setDirty(false)
    expect(store.getCount()).toBe(0)
  })

  it('un formulaire modifié est détecté puis libéré à la désinscription', () => {
    const store = createUnsavedChangesStore()
    const form = store.register()
    form.setDirty(true)
    expect(store.hasUnsavedChanges()).toBe(true)
    form.unregister()
    expect(store.hasUnsavedChanges()).toBe(false)
  })

  it('plusieurs formulaires : compte exact, un seul propre ne libère pas les autres', () => {
    const store = createUnsavedChangesStore()
    const a = store.register()
    const b = store.register()
    a.setDirty(true)
    b.setDirty(true)
    a.setDirty(true) // répété : pas de double comptage
    expect(store.getCount()).toBe(2)
    a.setDirty(false)
    expect(store.hasUnsavedChanges()).toBe(true)
    b.unregister()
    expect(store.hasUnsavedChanges()).toBe(false)
  })

  it('désinscription idempotente et setDirty après désinscription sans effet', () => {
    const store = createUnsavedChangesStore()
    const form = store.register()
    form.setDirty(true)
    form.unregister()
    form.unregister()
    form.setDirty(true)
    expect(store.getCount()).toBe(0)
  })

  it('notifie les abonnés uniquement quand l\'état change', () => {
    const store = createUnsavedChangesStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    const form = store.register()
    form.setDirty(false)
    expect(listener).not.toHaveBeenCalled()
    form.setDirty(true)
    form.setDirty(true)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    form.setDirty(false)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('liaison React : attach/release/attach (StrictMode) ne laisse aucun état périmé', () => {
    const store = createUnsavedChangesStore()
    const binding = createFormBinding(store)
    binding.attach()
    binding.sync(true)
    binding.release() // démontage simulé de StrictMode
    expect(store.hasUnsavedChanges()).toBe(false)
    binding.attach()
    binding.attach() // idempotent
    binding.sync(true)
    expect(store.getCount()).toBe(1)
    binding.release()
    expect(store.hasUnsavedChanges()).toBe(false)
    binding.sync(true) // après démontage : ignoré
    expect(store.hasUnsavedChanges()).toBe(false)
  })
})

describe('beforeunload', () => {
  it('aucun écouteur tant qu\'aucun formulaire n\'est modifié', () => {
    const win = fakeWindow()
    const store = createUnsavedChangesStore()
    attachBeforeUnloadGuard(store, win)
    store.register().setDirty(false)
    expect(win.count('beforeunload')).toBe(0)
  })

  it('formulaire modifié : la fermeture est interrompue ; propre : plus d\'écouteur', () => {
    const win = fakeWindow()
    const store = createUnsavedChangesStore()
    attachBeforeUnloadGuard(store, win)
    const form = store.register()
    form.setDirty(true)
    expect(win.count('beforeunload')).toBe(1)
    const event = win.emit('beforeunload', beforeUnloadEvent())
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(event.returnValue).toBe('')
    form.setDirty(false)
    expect(win.count('beforeunload')).toBe(0)
    const clean = win.emit('beforeunload', beforeUnloadEvent())
    expect(clean.preventDefault).not.toHaveBeenCalled()
  })

  it('jamais d\'écouteur en double, retiré à l\'arrêt', () => {
    const win = fakeWindow()
    const store = createUnsavedChangesStore()
    const stop = attachBeforeUnloadGuard(store, win)
    const a = store.register()
    const b = store.register()
    a.setDirty(true)
    b.setDirty(true)
    expect(win.count('beforeunload')).toBe(1)
    stop()
    expect(win.count('beforeunload')).toBe(0)
    b.setDirty(false)
    a.setDirty(false)
    expect(win.count('beforeunload')).toBe(0)
  })

  it('fermeture du formulaire (démontage) retire la protection', () => {
    const win = fakeWindow()
    const store = createUnsavedChangesStore()
    attachBeforeUnloadGuard(store, win)
    const form = store.register()
    form.setDirty(true)
    form.unregister()
    expect(win.count('beforeunload')).toBe(0)
  })

  it('choix explicite de quitter : pas de second avertissement ; rétablie si la mise à jour échoue', () => {
    const win = fakeWindow()
    const store = createUnsavedChangesStore()
    attachBeforeUnloadGuard(store, win)
    store.register().setDirty(true)
    const restore = store.allowUnload()
    expect(win.count('beforeunload')).toBe(0)
    expect(win.emit('beforeunload', beforeUnloadEvent()).preventDefault).not.toHaveBeenCalled()
    restore()
    expect(win.count('beforeunload')).toBe(1)
  })

  it('sans fenêtre : aucune erreur', () => {
    expect(() => attachBeforeUnloadGuard(createUnsavedChangesStore(), undefined)()).not.toThrow()
  })
})

describe('mise à jour PWA et saisies non enregistrées', () => {
  function setup() {
    const win = fakeWindow()
    const unsaved = createUnsavedChangesStore()
    const store = createPwaStore({ win, unsavedChanges: unsaved })
    const apply = vi.fn(() => Promise.resolve())
    store.markUpdateAvailable(apply)
    return { store, unsaved, apply, win }
  }

  it('sans saisie non enregistrée : la mise à jour s\'applique comme avant', async () => {
    const { store, apply } = setup()
    expect(await store.applyUpdate()).toEqual({ applied: true })
    expect(apply).toHaveBeenCalledTimes(1)
  })

  it('formulaire propre : mise à jour appliquée', async () => {
    const { store, unsaved, apply } = setup()
    unsaved.register().setDirty(false)
    expect(await store.applyUpdate()).toEqual({ applied: true })
    expect(apply).toHaveBeenCalledTimes(1)
  })

  it('formulaire modifié : mise à jour bloquée, rien n\'est rechargé, la notice reste', async () => {
    const { store, unsaved, apply } = setup()
    unsaved.register().setDirty(true)
    expect(await store.applyUpdate()).toEqual({ applied: false, blocked: true })
    expect(apply).not.toHaveBeenCalled()
    expect(selectNotices(store.getState()).update).toBe(true)
  })

  it('« Rester » : appeler dismissUpdate ou ne rien faire ne touche pas aux saisies', async () => {
    const { store, unsaved } = setup()
    const form = store.getState() && unsaved.register()
    form.setDirty(true)
    await store.applyUpdate()
    expect(unsaved.hasUnsavedChanges()).toBe(true)
  })

  it('« Quitter sans enregistrer » : une seule application, sans second avertissement', async () => {
    const { store, unsaved, apply, win } = setup()
    attachBeforeUnloadGuard(unsaved, win)
    unsaved.register().setDirty(true)
    expect(win.count('beforeunload')).toBe(1)
    let listenersDuringApply = -1
    apply.mockImplementation(async () => {
      listenersDuringApply = win.count('beforeunload')
    })
    expect(await store.applyUpdate({ discardUnsaved: true })).toEqual({ applied: true })
    expect(apply).toHaveBeenCalledTimes(1)
    expect(listenersDuringApply).toBe(0)
  })

  it('échec de la mise à jour confirmée : l\'erreur remonte et la protection revient', async () => {
    const { store, unsaved, apply, win } = setup()
    attachBeforeUnloadGuard(unsaved, win)
    unsaved.register().setDirty(true)
    apply.mockRejectedValueOnce(new Error('échec'))
    await expect(store.applyUpdate({ discardUnsaved: true })).rejects.toThrow('échec')
    expect(win.count('beforeunload')).toBe(1)
    expect(unsaved.hasUnsavedChanges()).toBe(true)
  })

  it('après enregistrement (formulaire démonté) la mise à jour n\'est plus bloquée', async () => {
    const { store, unsaved, apply } = setup()
    const form = unsaved.register()
    form.setDirty(true)
    expect((await store.applyUpdate()).blocked).toBe(true)
    form.unregister()
    expect(await store.applyUpdate()).toEqual({ applied: true })
    expect(apply).toHaveBeenCalledTimes(1)
  })

  it('sans mise à jour disponible : rien à appliquer', async () => {
    const store = createPwaStore({ win: fakeWindow(), unsavedChanges: createUnsavedChangesStore() })
    expect(await store.applyUpdate()).toEqual({ applied: false })
  })
})

describe('boîte de confirmation', () => {
  it('propose « Rester sur la page » et « Quitter sans enregistrer »', () => {
    const html = renderToStaticMarkup(createElement(UnsavedUpdateDialog, { onStay: () => {}, onDiscard: () => {} }))
    expect(html).toContain('Modifications non enregistrées')
    expect(html).toContain('Rester sur la page')
    expect(html).toContain('Quitter sans enregistrer')
    expect(html).toContain('role="alertdialog"')
  })

  it('boutons désactivés pendant la mise à jour', () => {
    const html = renderToStaticMarkup(createElement(UnsavedUpdateDialog, { isSubmitting: true, onStay: () => {}, onDiscard: () => {} }))
    expect(html.match(/disabled=""/g)?.length).toBe(2)
  })
})

describe('branchement dans l\'application (un seul mécanisme)', () => {
  it('useFormValidation (cotisation, retrait, activité, business, opération, connexion) et useDraftForm (Paramètres) utilisent useUnsavedChanges', () => {
    expect(text('src/hooks/useFormValidation.js')).toContain('useUnsavedChanges(')
    expect(text('src/hooks/useDraftForm.js')).toContain('useUnsavedChanges(isDirty)')
    expect(text('src/components/activities/ActivityActionDialog.jsx')).toContain('useUnsavedChanges(')
  })

  it('les formulaires de saisie passent tous par useFormValidation ou useDraftForm', () => {
    for (const file of [
      'src/components/contributions/RecordContributionForm.jsx',
      'src/components/withdrawals/WithdrawalForm.jsx',
      'src/components/activities/ActivityForm.jsx',
    ]) expect(text(file)).toContain('useFormValidation')
    expect(text('src/pages/settings/SettingsPage.jsx')).toContain('useDraftForm')
  })

  it('aucun mécanisme concurrent : un seul store de saisies, l\'avertissement beforeunload n\'est posé qu\'à un endroit', () => {
    expect(text('src/main.jsx')).toContain('attachBeforeUnloadGuard(unsavedChangesStore)')
    expect(text('src/pwa/defaultPwaStore.js')).toContain('unsavedChanges: unsavedChangesStore')
    expect(text('src/components/pwa/PwaNotices.jsx')).toContain('UnsavedUpdateDialog')
    const sources = ['src/pwa/pwaStore.js', 'src/hooks/useFormValidation.js', 'src/hooks/useDraftForm.js', 'src/components/pwa/PwaNotices.jsx']
    for (const file of sources) expect(text(file)).not.toContain('beforeunload')
  })

  it('aucun stockage navigateur dans le suivi des saisies', () => {
    for (const file of ['src/pwa/unsavedChangesStore.js', 'src/hooks/useUnsavedChanges.js', 'src/utils/formDirty.js', 'src/components/pwa/UnsavedUpdateDialog.jsx']) {
      expect(/localStorage|sessionStorage|indexedDB|caches\.|fetch\(/.test(text(file))).toBe(false)
    }
  })
})
