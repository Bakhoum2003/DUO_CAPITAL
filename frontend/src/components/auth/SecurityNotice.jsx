import { ShieldHalvedIcon } from '../../icons'

/**
 * Encart vert avec un bouclier, en bas du formulaire.
 *
 * Props :
 * - message : texte affiché (un saut de ligne \n est respecté)
 */
function SecurityNotice({ message }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl bg-brand-50 px-4 py-3.5">
      <ShieldHalvedIcon className="h-9 w-9 shrink-0 text-brand-600" aria-hidden="true" />
      <p className="whitespace-pre-line text-sm font-medium text-ink">{message}</p>
    </div>
  )
}

export default SecurityNotice
