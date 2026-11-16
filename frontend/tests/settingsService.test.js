import { afterEach, describe, expect, it } from 'vitest'
import { AMOUNT_FORMATS } from '../src/constants/settingsSettings'
import { applyAmountFormat, applyPreferences, applyTheme, resetAppearance } from '../src/services/settingsService'
import { formatCurrency, formatNumber, formatSignedAmount, setAmountSeparator } from '../src/utils/formatters'

const fakeRoot = () => ({ dataset: {}, style: {} })

afterEach(() => setAmountSeparator(' '))

describe("format des montants (jamais de modification des valeurs stockées)", () => {
  it('espace : 410 000 FCFA', () => {
    applyAmountFormat('space')
    expect(formatNumber(410000)).toBe('410 000')
    expect(formatCurrency(410000)).toBe('410 000 FCFA')
  })
  it('point : 410.000 FCFA', () => {
    applyAmountFormat('dot')
    expect(formatNumber(410000)).toBe('410.000')
    expect(formatCurrency(410000)).toBe('410.000 FCFA')
    expect(formatSignedAmount(-3000)).toBe('−3.000')
  })
  it('sans séparateur : 410000 FCFA', () => {
    applyAmountFormat('none')
    expect(formatCurrency(410000)).toBe('410000 FCFA')
    expect(formatNumber(1234567)).toBe('1234567')
  })
  it('format inconnu : retour à l’espace', () => {
    applyAmountFormat('dot')
    applyAmountFormat('inconnu')
    expect(formatNumber(15000)).toBe('15 000')
  })
  it('changement immédiat, sans rechargement, et la valeur numérique reste identique', () => {
    const amount = 125000
    applyAmountFormat('dot')
    const dotted = formatNumber(amount)
    applyAmountFormat('none')
    const plain = formatNumber(amount)
    expect(Number(dotted.replace(/\./g, ''))).toBe(amount)
    expect(Number(plain)).toBe(amount)
  })
  it('les trois formats proposés existent dans la liste des options', () => {
    expect(Object.keys(AMOUNT_FORMATS)).toEqual(['space', 'dot', 'none'])
  })
})

describe('thème', () => {
  it('sombre puis clair sur <html>', () => {
    const root = fakeRoot()
    expect(applyTheme('dark', root)).toBe('dark')
    expect(root.dataset.theme).toBe('dark')
    expect(root.style.colorScheme).toBe('dark')
    applyTheme('light', root)
    expect(root.dataset.theme).toBe('light')
  })
  it('thème inconnu : clair', () => {
    const root = fakeRoot()
    expect(applyTheme('violet', root)).toBe('light')
    expect(root.dataset.theme).toBe('light')
  })
  it('applyPreferences applique thème et format ensemble', () => {
    const root = fakeRoot()
    applyPreferences({ theme: 'dark', amountSeparator: 'dot' }, root)
    expect(root.dataset.theme).toBe('dark')
    expect(formatNumber(1000)).toBe('1.000')
  })
  it('déconnexion : apparence neutre, un associé ne garde pas les préférences de l’autre', () => {
    const root = fakeRoot()
    applyPreferences({ theme: 'dark', amountSeparator: 'none' }, root)
    resetAppearance(root)
    expect(root.dataset.theme).toBe('light')
    expect(formatNumber(1000)).toBe('1 000')
  })
})
