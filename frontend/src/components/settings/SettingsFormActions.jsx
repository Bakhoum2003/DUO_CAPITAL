import { ArrowRotateLeftIcon, FloppyDiskIcon } from '../../icons'
import ActionButton from '../common/ActionButton'

/**
 * Boutons Annuler / Enregistrer d'un formulaire de paramètres.
 * Ils ne sont actifs que s'il y a une modification non enregistrée, et pas pendant un enregistrement.
 *
 * Props :
 * - isDirty : le formulaire contient des modifications non enregistrées
 * - isSaving : un enregistrement est en cours (anti double envoi)
 * - onCancel : fonction appelée au clic sur « Annuler » (retour aux valeurs enregistrées)
 * - saveLabel : texte du bouton d'enregistrement
 */
function SettingsFormActions({ isDirty, isSaving = false, onCancel, saveLabel = 'Enregistrer' }) {
  return (
    <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
      {isDirty && <p className="text-sm text-ink-soft sm:mr-auto">Modifications non enregistrées.</p>}
      <ActionButton label="Annuler" icon={ArrowRotateLeftIcon} variant="secondary" onClick={onCancel} disabled={!isDirty || isSaving} />
      <ActionButton label={isSaving ? 'Enregistrement…' : saveLabel} icon={FloppyDiskIcon} type="submit" disabled={!isDirty || isSaving} />
    </div>
  )
}

export default SettingsFormActions
