const TONE_CLASSES = {
  neutral: 'text-ink hover:bg-surface',
  danger: 'text-danger-500 hover:bg-danger-50',
}

/**
 * Bouton rond qui ne contient qu'une icône (modifier, supprimer, fermer, mois précédent…).
 *
 * Props :
 * - icon : composant d'icône Font Awesome (voir src/icons)
 * - label : description accessible (lue par les lecteurs d'écran, affichée au survol)
 * - onClick : fonction appelée au clic
 * - tone : 'neutral' ou 'danger'
 * - hasBorder : ajoute une bordure grise autour du bouton
 * - disabled : désactive le bouton
 */
function IconButton({ icon: Icon, label, onClick, tone = 'neutral', hasBorder = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-40 ${TONE_CLASSES[tone]} ${
        hasBorder ? 'border border-line bg-white shadow-sm' : ''
      }`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  )
}

export default IconButton
