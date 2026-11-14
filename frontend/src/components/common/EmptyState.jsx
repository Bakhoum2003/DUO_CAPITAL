import ActionButton from './ActionButton'

/**
 * État vide : icône, message et bouton d'action optionnel.
 *
 * Props :
 * - icon : composant d'icône Font Awesome (voir src/icons)
 * - title : titre court
 * - description : explication sous le titre
 * - actionLabel : texte du bouton (optionnel : sans lui, pas de bouton)
 * - actionIcon : icône du bouton (optionnel)
 * - onAction : fonction appelée au clic sur le bouton
 */
function EmptyState({ icon: Icon, title, description, actionLabel, actionIcon, onAction }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </span>
      <h3 className="mt-5 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-soft">{description}</p>
      {actionLabel && (
        <div className="mt-6">
          <ActionButton label={actionLabel} icon={actionIcon} onClick={onAction} />
        </div>
      )}
    </div>
  )
}

export default EmptyState
