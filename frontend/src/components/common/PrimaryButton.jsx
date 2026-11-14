import { CircleNotchIcon } from '../../icons'

/**
 * Bouton principal vert, pleine largeur.
 *
 * Props :
 * - label : texte du bouton
 * - loadingLabel : texte affiché pendant le chargement
 * - icon : composant d'icône Font Awesome (voir src/icons) (ex. RightToBracketIcon) affiché à gauche du texte
 * - type : 'button' ou 'submit'
 * - isLoading : affiche un indicateur et désactive le bouton
 * - disabled : désactive le bouton
 * - onClick : fonction appelée au clic
 */
function PrimaryButton({
  label,
  loadingLabel = 'Chargement…',
  icon: Icon,
  type = 'button',
  isLoading = false,
  disabled = false,
  onClick,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-brand-600 px-6 text-lg font-semibold text-white shadow-md shadow-brand-700/20 transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isLoading ? (
        <>
          <CircleNotchIcon className="h-6 w-6 animate-spin" aria-hidden="true" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="h-6 w-6" aria-hidden="true" />}
          <span>{label}</span>
        </>
      )}
    </button>
  )
}

export default PrimaryButton
