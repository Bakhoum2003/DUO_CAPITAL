import { XmarkIcon } from '../../icons'
import { useRef } from 'react'
import useModalBehavior from '../../hooks/useModalBehavior'
import IconButton from './IconButton'

/**
 * Cadre d'une fenêtre modale de formulaire : fond assombri, titre, croix de fermeture,
 * Échap, blocage du défilement et piège à focus. À monter uniquement quand elle est ouverte.
 *
 * Props :
 * - idPrefix : préfixe des identifiants (titre et description), unique dans la page
 * - title : titre de la fenêtre
 * - description : phrase d'explication sous le titre
 * - formElement : le formulaire à afficher dans la fenêtre (élément React)
 * - onClose : fonction appelée pour fermer (croix, Échap, clic sur le fond)
 */
function FormModal({ idPrefix, title, description, formElement, onClose }) {
  const dialogRef = useRef(null)
  useModalBehavior({ dialogRef, onClose })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${idPrefix}-title`}
        aria-describedby={`${idPrefix}-description`}
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={`${idPrefix}-title`} className="text-xl font-extrabold text-ink">
              {title}
            </h2>
            <p id={`${idPrefix}-description`} className="mt-1 text-sm text-ink-soft">
              {description}
            </p>
          </div>
          <IconButton icon={XmarkIcon} label="Fermer la fenêtre" onClick={onClose} />
        </div>

        {formElement}
      </div>
    </div>
  )
}

export default FormModal
