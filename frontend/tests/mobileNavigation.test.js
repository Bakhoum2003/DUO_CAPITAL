import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import MobileBottomNav from '../src/components/dashboard/MobileBottomNav'
import { MOBILE_PRIMARY_ROUTES, NAVIGATION_ITEMS } from '../src/constants/navigationItems'
import { ROUTES } from '../src/routes/routePaths'
import { isMenuActive, isRouteActive, splitMobileNavigation } from '../src/utils/mobileNavigation'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const { primary, secondary } = splitMobileNavigation(NAVIGATION_ITEMS, MOBILE_PRIMARY_ROUTES)

function renderNav(pathname, { isMenuOpen = false } = {}) {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [pathname] },
      createElement(MobileBottomNav, { primaryItems: primary, isMenuActive: isMenuActive(pathname, primary), isMenuOpen, onOpenMenu: () => {} }),
    ),
  )
}

describe('navigation mobile : répartition des rubriques', () => {
  it('la barre du bas garde l’ordre demandé et le menu complet contient le reste', () => {
    expect(primary.map((item) => item.to)).toEqual(MOBILE_PRIMARY_ROUTES)
    expect(primary).toHaveLength(4)
    expect([...primary, ...secondary].map((item) => item.to).sort()).toEqual(NAVIGATION_ITEMS.map((item) => item.to).sort())
    expect(secondary.map((item) => item.to)).toEqual([ROUTES.ACTIVITIES, ROUTES.HISTORY, ROUTES.STATISTICS, ROUTES.SETTINGS])
  })

  it('aucune rubrique n’est perdue : chacune est dans la barre ou dans le tiroir (qui liste tout)', () => {
    const sidebar = read('src/components/dashboard/Sidebar.jsx')
    expect(sidebar.includes('navigationItems.map(')).toBe(true)
    expect(read('src/layouts/DashboardLayout.jsx').includes('navigationItems={NAVIGATION_ITEMS}')).toBe(true)
  })

  it('une route inconnue dans la liste principale est ignorée sans erreur', () => {
    expect(splitMobileNavigation(NAVIGATION_ITEMS, ['/absente']).primary).toEqual([])
  })
})

describe('navigation mobile : rubrique active', () => {
  it('isRouteActive : adresse exacte ou sous-page, jamais un simple préfixe de texte', () => {
    expect(isRouteActive('/activites', '/activites')).toBe(true)
    expect(isRouteActive('/activites/abc', '/activites')).toBe(true)
    expect(isRouteActive('/activites-autres', '/activites')).toBe(false)
    expect(isRouteActive('/dashboard', '/cotisations')).toBe(false)
  })

  it('le bouton Menu est actif seulement pour les rubriques absentes de la barre', () => {
    for (const item of primary) expect(isMenuActive(item.to, primary)).toBe(false)
    for (const item of secondary) expect(isMenuActive(item.to, primary)).toBe(true)
    expect(isMenuActive(`${ROUTES.ACTIVITIES}/123`, primary)).toBe(true)
  })

  it('exactement une rubrique de la barre est marquée page courante, ou aucune si la page est dans le menu', () => {
    for (const item of primary) {
      const html = renderNav(item.to)
      expect(html.match(/aria-current="page"/g)).toHaveLength(1)
      const current = html.match(/<a [^>]*aria-current="page"[^>]*>/)[0]
      expect(current).toContain(`href="${item.to}"`)
    }
    expect(renderNav(ROUTES.SETTINGS).includes('aria-current')).toBe(false)
  })
})

describe('navigation mobile : rendu', () => {
  const html = renderNav(ROUTES.CONTRIBUTIONS)

  it('liens React Router vers les 4 routes existantes, libellés accessibles complets', () => {
    for (const item of primary) {
      expect(html.includes(`href="${item.to}"`)).toBe(true)
      expect(html.includes(`aria-label="${item.label}"`)).toBe(true)
    }
    expect(html.includes('>Accueil<')).toBe(true)
  })

  it('bouton Menu : ouvre le tiroir existant et expose son état', () => {
    expect(html).toContain('aria-controls="dashboard-sidebar"')
    expect(html).toContain('aria-expanded="false"')
    expect(renderNav(ROUTES.CONTRIBUTIONS, { isMenuOpen: true })).toContain('aria-expanded="true"')
    expect(html.includes('>Menu<')).toBe(true)
  })

  it('barre fixe en bas, pleine largeur, masquée dès md, avec la zone de sécurité du téléphone', () => {
    expect(html).toContain('fixed inset-x-0 bottom-0')
    expect(html).toContain('md:hidden')
    expect(html).toContain('pb-[env(safe-area-inset-bottom)]')
    expect(html).toContain('aria-label="Navigation mobile"')
  })

  it('la rubrique active est mise en évidence (couleur de marque + repère), les autres restent neutres', () => {
    expect(html.match(/text-brand-700/g)).toHaveLength(1)
    expect(html.match(/bg-brand-500/g)).toHaveLength(1)
    expect(renderNav(ROUTES.HISTORY).match(/text-brand-700/g)).toHaveLength(1)
  })

  it('n’utilise que des icônes Font Awesome du projet', () => {
    expect(/lucide-react/.test(read('src/components/dashboard/MobileBottomNav.jsx'))).toBe(false)
    expect(read('src/components/dashboard/MobileBottomNav.jsx')).toContain("from '../../icons'")
  })
})

describe('navigation mobile : mise en page', () => {
  const layout = read('src/layouts/DashboardLayout.jsx')

  it('la barre est montée une seule fois, dans la mise en page connectée', () => {
    expect(layout.match(/<MobileBottomNav/g)).toHaveLength(1)
    expect(layout.includes('<Sidebar')).toBe(true)
  })

  it('le contenu réserve la hauteur de la barre + zone de sécurité sur mobile, et retrouve son espacement dès md', () => {
    expect(layout).toContain('pb-[calc(5.5rem+env(safe-area-inset-bottom))]')
    expect(layout).toContain('md:pb-10')
  })

  it('desktop inchangé : menu latéral fixe dès lg et contenu décalé de sa largeur', () => {
    expect(layout).toContain('lg:pl-60')
    const sidebar = read('src/components/dashboard/Sidebar.jsx')
    expect(sidebar).toContain('lg:translate-x-0')
    expect(sidebar).toContain('lg:w-60')
  })

  it('le bouton ☰ de l’en-tête reste disponible sur tablette, et disparaît sur mobile (remplacé par Menu) et sur ordinateur', () => {
    const header = read('src/components/dashboard/DashboardHeader.jsx')
    expect(header).toContain('max-md:hidden lg:hidden')
  })

  it('empilement : barre sous le tiroir et sous les fenêtres modales', () => {
    expect(read('src/components/dashboard/MobileBottomNav.jsx')).toContain('z-20')
    expect(read('src/components/dashboard/Sidebar.jsx')).toContain('z-40')
    expect(read('src/components/common/FormModal.jsx')).toContain('z-50')
    expect(read('src/components/common/ConfirmDialog.jsx')).toContain('z-50')
  })

  it('index.html : viewport-fit=cover (nécessaire pour env(safe-area-inset-bottom))', () => {
    expect(read('index.html')).toContain('viewport-fit=cover')
  })
})
