import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')
const css = source('../src/styles/index.css')

describe('mode sombre (variables CSS centralisées)', () => {
  it('redéfinit les jetons sémantiques sous html[data-theme="dark"]', () => {
    const block = css.slice(css.indexOf("html[data-theme='dark'] {"), css.indexOf('@layer utilities'))
    for (const token of ['--color-surface', '--color-ink', '--color-ink-soft', '--color-line', '--color-card', '--color-brand-50']) {
      expect(block).toContain(token)
    }
    expect(block).toContain('color-scheme: dark')
  })
  it('les cartes (bg-white) suivent le thème sans écraser les variantes hover (spécificité faible)', () => {
    expect(css).toMatch(/:where\(html\[data-theme='dark'\]\) \.bg-white\s*\{\s*background-color: var\(--color-card\)/)
  })
  it('les fonds d’écran semi-transparents (bg-ink/50) restent sombres', () => {
    expect(css).toMatch(/\.bg-ink\\\/50\s*\{\s*background-color: rgb\(0 0 0/)
  })
  it('couvre les graphiques Recharts : axes, grille, infobulle, légende', () => {
    for (const selector of ['.recharts-cartesian-axis-tick-value', '.recharts-cartesian-grid', '.recharts-default-tooltip', '.recharts-legend-item-text']) {
      expect(css).toContain(`html[data-theme='dark'] ${selector}`)
    }
  })
  it('les éléments qui doivent rester blancs n’utilisent pas la classe bg-white', () => {
    expect(source('../src/components/common/ToggleSwitch.jsx')).not.toMatch(/rounded-full bg-white/)
    expect(source('../src/components/dashboard/SidebarUserCard.jsx')).not.toMatch(/bg-white text-brand-700/)
  })
})

describe('aucune source de vérité dans le navigateur', () => {
  it('le contexte des préférences et le service n’utilisent ni localStorage ni sessionStorage', () => {
    for (const file of ['../src/context/PreferencesContext.jsx', '../src/context/RemindersContext.jsx', '../src/services/settingsService.js', '../src/services/settingsApi.js', '../src/hooks/useSettings.js']) {
      expect(/localStorage|sessionStorage|document\.cookie/.test(source(file))).toBe(false)
    }
  })
  it('main.jsx ne lit plus de préférences locales', () => {
    expect(source('../src/main.jsx')).not.toContain('applyStoredPreferences')
  })
  it('la bannière « Version sans backend » a disparu de la page Paramètres', () => {
    expect(source('../src/pages/settings/SettingsPage.jsx')).not.toContain('Version sans backend')
  })
  it('les emails restent désactivés : aucune action d’envoi', () => {
    const preferences = source('../src/components/settings/PreferencesSection.jsx')
    expect(preferences).toContain('Non disponible')
    expect(/smtp|sendMail/i.test(preferences)).toBe(false)
  })
})
