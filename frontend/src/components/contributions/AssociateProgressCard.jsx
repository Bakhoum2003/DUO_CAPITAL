import { CircleCheckIcon } from '../../icons'
import { formatCurrency } from '../../utils/formatters'
import Avatar from '../common/Avatar'
import ProgressBar from '../common/ProgressBar'

/**
 * Progression mensuelle d'un associé vers son objectif.
 *
 * Props :
 * - name : nom de l'associé
 * - initials : initiales (avatar)
 * - avatarTone : couleur de l'avatar ('green' ou 'red')
 * - collected : montant cotisé ce mois-ci (FCFA)
 * - target : objectif mensuel de l'associé (FCFA)
 * - remaining : montant restant pour atteindre l'objectif (FCFA)
 * - percent : progression de 0 à 100
 * - isComplete : l'objectif est-il atteint
 */
function AssociateProgressCard({ name, initials, avatarTone, collected, target, remaining, percent, isComplete }) {
  return (
    <article className="rounded-2xl border border-line bg-white p-4">
      <div className="flex items-center gap-3">
        <Avatar initials={initials} tone={avatarTone} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-ink">{name}</h3>
          <p className="text-sm text-ink-soft">
            {formatCurrency(collected)} sur {formatCurrency(target)}
          </p>
        </div>
        <p className="text-lg font-extrabold text-ink">{percent} %</p>
      </div>

      <div className="mt-4">
        <ProgressBar value={percent} label={`Progression de ${name}`} tone={isComplete ? 'green' : 'amber'} />
      </div>

      <p
        className={`mt-3 flex items-center gap-1.5 text-sm font-semibold ${
          isComplete ? 'text-brand-700' : 'text-amber-700'
        }`}
      >
        {isComplete ? (
          <>
            <CircleCheckIcon className="h-4 w-4" aria-hidden="true" />
            Objectif atteint
          </>
        ) : (
          `Reste ${formatCurrency(remaining)} à cotiser`
        )}
      </p>
    </article>
  )
}

export default AssociateProgressCard
