import { RotateLeftIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import ActionButton from '../common/ActionButton'

/**
 * Réinitialisation des paramètres. Ne concerne jamais les cotisations, les business ni les opérations.
 *
 * Props :
 * - isDisabled : désactive le bouton (enregistrement en cours)
 */
function ResetSection({ onReset, isDisabled = false }) {
  return (
    <section className={`${CARD_CLASSES} border-danger-500/30`} aria-label="Réinitialisation de mes préférences">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-ink">Réinitialiser mes préférences</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Rétablit uniquement vos préférences personnelles (thème, format des montants, notifications). Les paramètres communs,
            l'autre associé et vos données financières ne sont jamais modifiés.
          </p>
        </div>
        <div className="shrink-0">
          <ActionButton label="Réinitialiser" icon={RotateLeftIcon} variant="danger" onClick={onReset} disabled={isDisabled} />
        </div>
      </div>
    </section>
  )
}

export default ResetSection
