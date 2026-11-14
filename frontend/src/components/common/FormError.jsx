import { CircleExclamationIcon, CircleInfoIcon } from '../../icons'

/**
 * Message d'erreur (ou d'information) de formulaire. N'affiche rien si `message` est vide.
 *
 * Props :
 * - message : texte à afficher
 * - id : identifiant (pour aria-describedby du champ concerné)
 * - variant : 'field' (petit texte sous un champ) ou 'banner' (encadré pour tout le formulaire)
 * - tone : 'error' (rouge) ou 'info' (vert), utile surtout avec le variant 'banner'
 */
function FormError({ message, id, variant = 'field', tone = 'error' }) {
  if (!message) return null

  const isInfo = tone === 'info'
  const Icon = isInfo ? CircleInfoIcon : CircleExclamationIcon

  if (variant === 'banner') {
    const bannerColors = isInfo
      ? 'border-brand-200 bg-brand-50 text-brand-800'
      : 'border-danger-500/30 bg-danger-50 text-danger-600'

    return (
      <div
        id={id}
        role={isInfo ? 'status' : 'alert'}
        className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${bannerColors}`}
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
    )
  }

  return (
    <p id={id} role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm text-danger-600">
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  )
}

export default FormError
