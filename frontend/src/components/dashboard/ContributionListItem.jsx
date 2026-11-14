import { CONTRIBUTION_STATUSES } from '../../constants/statusStyles'
import { formatCurrency, formatShortDate } from '../../utils/formatters'
import Avatar from '../common/Avatar'
import StatusBadge from '../common/StatusBadge'

/**
 * Une ligne de la liste « Cotisations du mois ».
 *
 * Props :
 * - associateName : nom de l'associé
 * - initials : initiales de l'associé (avatar)
 * - avatarTone : couleur de l'avatar ('green' ou 'red')
 * - monthLabel : mois concerné (ex. « Novembre 2026 »)
 * - amount : montant de la cotisation (FCFA)
 * - paidOn : date de paiement ISO « AAAA-MM-JJ » (null si pas encore payée)
 * - status : 'paid', 'pending' ou 'late'
 */
function ContributionListItem({ associateName, initials, avatarTone, monthLabel, amount, paidOn, status }) {
  const statusStyle = CONTRIBUTION_STATUSES[status]

  return (
    <li className="flex items-center gap-3 py-3.5">
      <Avatar initials={initials} tone={avatarTone} size="md" />

      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">{associateName}</p>
        <p className="text-sm text-ink-soft">
          {monthLabel} ·{' '}
          <span className="whitespace-nowrap">
            {paidOn ? `Payé le ${formatShortDate(paidOn)}` : 'Paiement non reçu'}
          </span>
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <p className="font-bold text-ink">{formatCurrency(amount)}</p>
        <StatusBadge label={statusStyle.label} tone={statusStyle.tone} />
      </div>
    </li>
  )
}

export default ContributionListItem
