import { readFileSync, readdirSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const srcDir = new URL('../src/', import.meta.url)
const read = (url) => readFileSync(url, 'utf8')

function listSources(dirUrl) {
  return readdirSync(dirUrl).flatMap((name) => {
    const url = new URL(name, dirUrl)
    return statSync(url).isDirectory() ? listSources(new URL(`${name}/`, dirUrl)) : /\.(jsx?|css)$/.test(name) ? [url] : []
  })
}
const files = listSources(srcDir)
const iconsSource = read(new URL('icons/index.jsx', srcDir))
const exported = new Set([...iconsSource.matchAll(/export const (\w+Icon) = createIcon/g)].map((match) => match[1]))

describe('icônes : Font Awesome exclusivement', () => {
  it('aucune importation de lucide-react ni d’une autre bibliothèque d’icônes', () => {
    for (const url of files) expect(/lucide-react|react-icons|@heroicons|@phosphor|@tabler|bootstrap-icons/.test(read(url))).toBe(false)
  })

  it('package.json : paquets Font Awesome présents, lucide-react retiré', () => {
    const { dependencies } = JSON.parse(read(new URL('../package.json', import.meta.url)))
    for (const name of ['@fortawesome/fontawesome-svg-core', '@fortawesome/free-solid-svg-icons', '@fortawesome/react-fontawesome']) {
      expect(Boolean(dependencies[name])).toBe(true)
    }
    expect(Object.hasOwn(dependencies, 'lucide-react')).toBe(false)
  })

  it('chaque icône importée existe dans le module icons, sans doublon', () => {
    for (const url of files) {
      for (const match of read(url).matchAll(/import \{([^}]+)\} from '(?:\.\.\/)*(?:\.\/)?icons'/g)) {
        const names = match[1].split(',').map((name) => name.trim())
        expect(new Set(names).size).toBe(names.length)
        for (const name of names) expect(exported.has(name)).toBe(true)
      }
    }
  })

  it('aucune icône exportée n’est inutilisée', () => {
    const usage = files.filter((url) => !url.pathname.endsWith('/icons/index.jsx')).map(read).join('\n')
    for (const name of exported) expect(usage.includes(name)).toBe(true)
  })

  it('le module n’importe que le style Solid de Font Awesome', () => {
    const imports = [...iconsSource.matchAll(/from '(@fortawesome\/[^']+)'/g)].map((match) => match[1])
    expect(imports.sort()).toEqual(['@fortawesome/fontawesome-svg-core', '@fortawesome/free-solid-svg-icons', '@fortawesome/react-fontawesome'])
  })

  it('navigation : icônes Font Awesome demandées', () => {
    const navigation = read(new URL('constants/navigationItems.js', srcDir))
    for (const name of ['GaugeHighIcon', 'HandHoldingDollarIcon', 'WalletIcon', 'BriefcaseIcon', 'ClockRotateLeftIcon', 'ChartLineIcon', 'GearIcon']) {
      expect(navigation.includes(name)).toBe(true)
    }
  })

  it('les icônes seules dans un bouton ont un libellé accessible (IconButton)', () => {
    const iconButton = read(new URL('components/common/IconButton.jsx', srcDir))
    expect(iconButton.includes('aria-label={label}')).toBe(true)
  })

  it('les icônes se dimensionnent par les classes Tailwind (règles Font Awesome en couche base)', () => {
    const css = read(new URL('styles/index.css', srcDir))
    expect(/@layer base\s*\{\s*\.svg-inline--fa/.test(css)).toBe(true)
    expect(iconsSource.includes('config.autoAddCss = false')).toBe(true)
  })
})
