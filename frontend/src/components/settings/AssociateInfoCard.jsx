import { formatCurrency } from '../../utils/formatters'
import Avatar from '../common/Avatar'

/**
 * Fiche d'un associé (lecture seule).
 *
 * Props :
 * - name : nom complet
 * - initials : initiales (avatar)
 * - avatarTone : couleur de l'avatar ('green' ou 'red')
 * - roleLabel : rôle (« Associé »)
 * - participationPercent : part de l'associé dans le fonds (en %)
 * - monthlyTarget : objectif mensuel de cotisation (FCFA)
 */
function AssociateInfoCard({ name, initials, avatarTone, roleLabel, participationPercent, monthlyTarget }) {
  return (
    <article className="rounded-2xl border border-line bg-white p-4">
      <div className="flex items-center gap-3">
        <Avatar initials={initials} tone={avatarTone} size="md" />
        <div className="min-w-0">
          <h3 className="font-bold text-ink">{name}</h3>
          <p className="text-sm text-ink-soft">{roleLabel}</p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-ink-soft">Participation</dt>
          <dd className="font-semibold text-ink">{participationPercent} % du fonds</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Objectif mensuel</dt>
          <dd className="font-semibold text-ink">{formatCurrency(monthlyTarget)}</dd>
        </div>
      </dl>
    </article>
  )
}

export default AssociateInfoCard
