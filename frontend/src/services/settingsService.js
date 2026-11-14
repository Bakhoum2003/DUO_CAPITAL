import { AMOUNT_FORMATS } from '../constants/settingsSettings'
import { setAmountSeparator } from '../utils/formatters'

// Application des préférences personnelles à l'interface (thème et format des montants).
// Les préférences viennent du serveur (voir PreferencesContext) : rien n'est lu ni écrit dans le stockage du navigateur.

export const THEMES = ['light', 'dark']
export const DEFAULT_THEME = 'light'
export const DEFAULT_AMOUNT_FORMAT = 'space'

/** Format des montants : espace insécable, point ou aucun séparateur. Une clé inconnue retombe sur « espace ». */
export function applyAmountFormat(amountFormat) {
  const format = Object.hasOwn(AMOUNT_FORMATS, amountFormat) ? AMOUNT_FORMATS[amountFormat] : AMOUNT_FORMATS[DEFAULT_AMOUNT_FORMAT]
  setAmountSeparator(format.separator)
  return format.separator
}

/** Thème : attribut `data-theme` sur <html> (les variables CSS font le reste). Retourne le thème réellement appliqué. */
export function applyTheme(theme, root = globalThis.document?.documentElement) {
  const applied = THEMES.includes(theme) ? theme : DEFAULT_THEME
  if (root) {
    root.dataset.theme = applied
    root.style.colorScheme = applied
  }
  return applied
}

/** Applique thème et format des montants d'un objet de préférences. */
export function applyPreferences(preferences, root) {
  applyAmountFormat(preferences?.amountSeparator)
  return applyTheme(preferences?.theme, root)
}

/** Retour à l'apparence neutre (déconnexion : les préférences d'un associé ne doivent pas rester pour l'autre). */
export function resetAppearance(root) {
  applyAmountFormat(DEFAULT_AMOUNT_FORMAT)
  applyTheme(DEFAULT_THEME, root)
}
