import { PlusIcon } from '../../icons'
import ActionButton from './ActionButton'

/**
 * En-tête d'une page de module : titre, description et bouton d'ajout.
 *
 * Props :
 * - title : titre de la page
 * - description : phrase d'explication sous le titre
 * - addButtonLabel : texte du bouton d'ajout (optionnel : sans lui, pas de bouton)
 * - onAddClick : fonction appelée au clic sur le bouton (ouvre la fenêtre d'ajout)
 */
function PageHeader({ title, description, addButtonLabel, onAddClick }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft sm:text-base">{description}</p>
      </div>

      {addButtonLabel && (
        <div className="shrink-0">
          <ActionButton label={addButtonLabel} icon={PlusIcon} onClick={onAddClick} />
        </div>
      )}
    </div>
  )
}

export default PageHeader
