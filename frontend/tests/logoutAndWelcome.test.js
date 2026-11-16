import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import LogoutConfirmDialog from '../src/components/dashboard/LogoutConfirmDialog'
import { createLogoutRunner } from '../src/utils/logoutFlow'
import { toCurrentUserView } from '../src/utils/userView'
import { buildWelcomeTitle } from '../src/utils/welcomeMessage'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const mohamed = toCurrentUserView({ id: '1', name: 'Mohamed Bakhoum', email: 'm@example.test', partnerNumber: 1 })
const cheikh = toCurrentUserView({ id: '2', name: 'Cheikh Sow', email: 'c@example.test', partnerNumber: 2 })

describe('message de bienvenue', () => {
  it('Mohamed Bakhoum : message exact', () => {
    expect(buildWelcomeTitle(mohamed)).toBe('Bienvenue, Mohamed Bakhoum 👋')
  })

  it('Cheikh Sow : message exact', () => {
    expect(buildWelcomeTitle(cheikh)).toBe('Bienvenue, Cheikh Sow 👋')
  })

  it('l’emoji 👋 vient après le nom, une seule fois', () => {
    for (const user of [mohamed, cheikh]) {
      const title = buildWelcomeTitle(user)
      expect(title.endsWith(`${user.fullName} 👋`)).toBe(true)
      expect(title.split('👋')).toHaveLength(2)
    }
  })

  it('le nom dépend de l’utilisateur authentifié (aucun nom codé en dur)', () => {
    expect(buildWelcomeTitle(mohamed)).not.toBe(buildWelcomeTitle(cheikh))
    expect(buildWelcomeTitle({ fullName: 'Awa Ndiaye' })).toBe('Bienvenue, Awa Ndiaye 👋')
    const source = read('../src/utils/welcomeMessage.js')
    expect(/Mohamed|Cheikh|Bakhoum|Sow/.test(source)).toBe(false)
    const layout = read('../src/layouts/DashboardLayout.jsx')
    expect(layout.includes('buildWelcomeTitle(user)')).toBe(true)
    expect(/Mohamed|Cheikh|Bakhoum|Sow/.test(layout)).toBe(false)
  })
})

describe('confirmation de déconnexion : contenu de la fenêtre', () => {
  const html = renderToStaticMarkup(createElement(LogoutConfirmDialog, { onConfirm: () => {}, onClose: () => {} }))

  it('affiche le titre, le message et les deux boutons demandés', () => {
    expect(html).toContain('role="alertdialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('>Déconnexion</h2>')
    expect(html).toContain('Êtes-vous sûr de vouloir vous déconnecter de votre compte ?')
    expect(html).toContain('Annuler')
    expect(html).toContain('Se déconnecter')
    expect(html.includes('disabled=""')).toBe(false)
  })

  it('pendant la déconnexion, les deux boutons sont désactivés', () => {
    const busy = renderToStaticMarkup(createElement(LogoutConfirmDialog, { isSubmitting: true, onConfirm: () => {}, onClose: () => {} }))
    expect(busy.match(/disabled=""/g)).toHaveLength(2)
  })
})

describe('confirmation de déconnexion : branchement', () => {
  const layout = read('../src/layouts/DashboardLayout.jsx')
  const dialog = read('../src/components/common/ConfirmDialog.jsx')

  it('le bouton de la barre latérale ouvre la fenêtre sans déconnecter', () => {
    expect(layout.includes('onLogout={() => setIsLogoutDialogOpen(true)}')).toBe(true)
    expect(layout.includes('onLogout={handleLogout}')).toBe(false)
    expect(layout.includes('{isLogoutDialogOpen && (')).toBe(true)
  })

  it('Annuler / Échap / clic à l’extérieur ferment sans déconnecter ; Confirmer lance la déconnexion existante', () => {
    expect(layout.includes('onClose={() => setIsLogoutDialogOpen(false)}')).toBe(true)
    expect(layout.includes('onConfirm={handleLogout}')).toBe(true)
    expect(layout.includes('await runLogout()')).toBe(true)
    expect(dialog.includes('onClick={handleClose} aria-hidden="true"')).toBe(true)
    expect(dialog.includes('label="Annuler" variant="secondary" onClick={handleClose}')).toBe(true)
    expect(dialog.includes('useModalBehavior({ dialogRef, onClose: handleClose })')).toBe(true)
    expect(read('../src/hooks/useModalBehavior.js').includes("event.key === 'Escape'")).toBe(true)
  })

  it('la fenêtre ne se ferme pas pendant le traitement', () => {
    expect(dialog.includes('if (!isSubmitting) onClose()')).toBe(true)
  })
})

describe('anti double-clic de la déconnexion', () => {
  it('plusieurs appels simultanés ne déclenchent qu’une seule déconnexion', async () => {
    let finish
    const logout = vi.fn(() => new Promise((resolve) => { finish = resolve }))
    const run = createLogoutRunner(logout)
    const first = run()
    const second = run()
    const third = run()
    expect(await second).toEqual({ ok: false, skipped: true })
    expect(await third).toEqual({ ok: false, skipped: true })
    finish({ ok: true })
    expect(await first).toEqual({ ok: true })
    expect(logout).toHaveBeenCalledTimes(1)
    // Après une réussite la garde reste active (la session a disparu).
    expect(await run()).toEqual({ ok: false, skipped: true })
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('après un échec, l’utilisateur peut réessayer', async () => {
    const logout = vi.fn().mockResolvedValueOnce({ ok: false, message: 'Réseau indisponible.' }).mockResolvedValueOnce({ ok: true })
    const run = createLogoutRunner(logout)
    expect(await run()).toEqual({ ok: false, message: 'Réseau indisponible.' })
    expect(await run()).toEqual({ ok: true })
    expect(logout).toHaveBeenCalledTimes(2)
  })

  it('une exception relâche aussi la garde', async () => {
    const logout = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ ok: true })
    const run = createLogoutRunner(logout)
    await expect(run()).rejects.toThrow('boom')
    expect(await run()).toEqual({ ok: true })
  })
})
