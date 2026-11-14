import { ClockRotateLeftIcon, WalletIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { formatCurrency, formatMonthLabel, formatShortDate } from '../../utils/formatters'
import ActionButton from '../common/ActionButton'
import EmptyState from '../common/EmptyState'
import SectionHeader from '../common/SectionHeader'

/**
 * Historique des cotisations (tableau sur grand écran, cartes sur mobile) avec pagination. Lecture seule :
 * une cotisation est un mouvement réel, elle ne se modifie ni ne se supprime depuis l'interface.
 * Props : contributions, meta { page, totalPages, total, filteredAmount }, hasActiveFilters, onPageChange, onAdd.
 */
function ContributionLedger({ contributions, meta, hasActiveFilters, onPageChange, onAdd, isRefreshing }) {
  return (
    <section className={CARD_CLASSES} aria-label="Historique des cotisations" aria-busy={isRefreshing}>
      <SectionHeader icon={ClockRotateLeftIcon} title="Historique des cotisations" badgeLabel={meta ? `${meta.total} versement(s) · ${formatCurrency(meta.filteredAmount)}` : undefined} />

      {contributions.length === 0 ? (
        <EmptyState
          icon={WalletIcon}
          title={hasActiveFilters ? 'Aucun résultat' : 'Aucune cotisation enregistrée'}
          description={hasActiveFilters ? 'Aucune cotisation ne correspond à ces filtres.' : "Les cotisations apparaîtront ici dès qu'un versement réel aura été enregistré."}
          actionLabel={hasActiveFilters ? undefined : 'Enregistrer une cotisation'}
          onAction={onAdd}
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-ink-soft">
                <tr>
                  {['Date du versement', 'Associé', 'Mois concerné', 'Montant', 'Informations', 'Enregistré par'].map((label) => (
                    <th key={label} scope="col" className="px-3 py-2 font-semibold">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contributions.map((item) => (
                  <tr key={item.id} className="border-t border-line">
                    <td className="whitespace-nowrap px-3 py-3 text-ink">{formatShortDate(item.contributionDate)}</td>
                    <td className="px-3 py-3 font-semibold text-ink">{item.partner.name}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-ink">{formatMonthLabel(item.period)}</td>
                    <td className="whitespace-nowrap px-3 py-3 font-bold text-ink">{formatCurrency(item.amount)}</td>
                    <td className="px-3 py-3 text-ink-soft">{item.note || '—'}</td>
                    <td className="px-3 py-3 text-ink-soft">{item.recordedBy.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-line md:hidden">
            {contributions.map((item) => (
              <li key={item.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-ink">{item.partner.name}</p>
                  <p className="font-bold text-ink">{formatCurrency(item.amount)}</p>
                </div>
                <p className="text-sm text-ink-soft">{formatShortDate(item.contributionDate)} · {formatMonthLabel(item.period)}</p>
                {item.note && <p className="mt-1 text-sm text-ink-soft">{item.note}</p>}
              </li>
            ))}
          </ul>

          {meta && meta.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3">
              <ActionButton label="Précédent" variant="secondary" size="sm" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)} />
              <p className="text-sm text-ink-soft">Page {meta.page} sur {meta.totalPages}</p>
              <ActionButton label="Suivant" variant="secondary" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)} />
            </nav>
          )}
        </>
      )}
    </section>
  )
}

export default ContributionLedger
