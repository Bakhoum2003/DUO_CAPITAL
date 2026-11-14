/**
 * Ligne « libellé : valeur » en lecture seule.
 *
 * Props :
 * - label : nom de l'information
 * - value : valeur affichée
 * - noteLabel : petite précision sous la valeur (optionnel)
 */
function SettingsInfoRow({ label, value, noteLabel }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <dt className="shrink-0 text-sm text-ink-soft">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-semibold text-ink sm:text-right">
        {value}
        {noteLabel && <span className="mt-0.5 block text-xs font-normal text-ink-soft">{noteLabel}</span>}
      </dd>
    </div>
  )
}

export default SettingsInfoRow
