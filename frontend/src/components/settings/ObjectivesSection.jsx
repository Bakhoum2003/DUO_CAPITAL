import { BullseyeIcon, CircleCheckIcon } from '../../icons'
import { formatCurrency } from '../../utils/formatters'
import SettingsSection from './SettingsSection'

/**
 * Objectifs financiers actuels (lecture seule), identiques à ceux de Cotisations, Dashboard et Statistiques.
 *
 * Props :
 * - individualTarget : cotisation mensuelle individuelle (FCFA)
 * - collectiveTarget : objectif collectif mensuel (FCFA)
 * - associateCount : nombre d'associés
 * - isConsistent : vrai si l'objectif collectif = individuel × nombre d'associés
 */
function ObjectivesSection({ individualTarget, collectiveTarget, associateCount, isConsistent }) {
  return (
    <SettingsSection
      icon={BullseyeIcon}
      title="Objectifs financiers"
      badgeLabel="Lecture seule"
      contentElement={
        <>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-brand-50 px-4 py-3">
              <dt className="text-sm text-ink-soft">Cotisation mensuelle individuelle</dt>
              <dd className="mt-0.5 text-xl font-extrabold text-ink">{formatCurrency(individualTarget)}</dd>
            </div>
            <div className="rounded-xl bg-brand-50 px-4 py-3">
              <dt className="text-sm text-ink-soft">Objectif collectif mensuel</dt>
              <dd className="mt-0.5 text-xl font-extrabold text-ink">{formatCurrency(collectiveTarget)}</dd>
              <p className="text-xs text-ink-soft">
                {associateCount} associés × {formatCurrency(individualTarget)}
              </p>
            </div>
          </dl>

          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-brand-700">
            <CircleCheckIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {isConsistent ? 'Objectifs cohérents avec Cotisations, Dashboard et Statistiques.' : 'Incohérence détectée dans les objectifs.'}
          </p>
          <p className="mt-2 rounded-xl bg-surface px-4 py-3 text-sm text-ink-soft">
            Ces montants ne se modifient pas ici : ils sont fixés par le serveur et alimentent plusieurs modules, afin de rester
            identiques partout.
          </p>
        </>
      }
    />
  )
}

export default ObjectivesSection
