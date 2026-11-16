import { AMOUNT_FORMATS } from '../constants/settingsSettings'
import { setAmountSeparator } from '../utils/formatters'


export const THEMES = ['light', 'dark']
export const DEFAULT_THEME = 'light'
export const DEFAULT_AMOUNT_FORMAT = 'space'

export function applyAmountFormat(amountFormat) {
  const format = Object.hasOwn(AMOUNT_FORMATS, amountFormat) ? AMOUNT_FORMATS[amountFormat] : AMOUNT_FORMATS[DEFAULT_AMOUNT_FORMAT]
  setAmountSeparator(format.separator)
  return format.separator
}

export function applyTheme(theme, root = globalThis.document?.documentElement) {
  const applied = THEMES.includes(theme) ? theme : DEFAULT_THEME
  if (root) {
    root.dataset.theme = applied
    root.style.colorScheme = applied
  }
  return applied
}

export function applyPreferences(preferences, root) {
  applyAmountFormat(preferences?.amountSeparator)
  return applyTheme(preferences?.theme, root)
}

export function resetAppearance(root) {
  applyAmountFormat(DEFAULT_AMOUNT_FORMAT)
  applyTheme(DEFAULT_THEME, root)
}
