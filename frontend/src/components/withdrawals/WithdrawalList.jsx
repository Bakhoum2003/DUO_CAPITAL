import { MagnifyingGlassIcon, MoneyBillTransferIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { formatShortDate } from '../../utils/formatters'
import { formatMoney } from '../../utils/treasuryViewModel'
import ActionButton from '../common/ActionButton'
import EmptyState from '../common/EmptyState'
import SectionHeader from '../common/SectionHeader'

const HEADERS = ['Date', 'Bénéficiaire', 'Auteur', 'Motif', 'Montant', 'Actions']

function RowActions({ withdrawal, onDetails, onEdit, onDelete, disabled }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <ActionButton label="Détails" variant="secondary" size="sm" onClick={() => onDetails(withdrawal)} />
      <ActionButton label="Modifier" variant="secondary" size="sm" disabled={disabled} onClick={() => onEdit(withdrawal)} />
      <ActionButton label="Supprimer" variant="secondary" size="sm" disabled={disabled} onClick={() => onDelete(withdrawal)} />
    </div>
  )
}

function WithdrawalList({ withdrawals, meta, hasActiveFilters, isRefreshing, disabled, onPageChange, onDetails, onEdit, onDelete, onReset, onAdd }) {
  const badge = meta ? `${meta.total} retrait(s) · ${formatMoney(meta.filteredAmount)}` : undefined
  const actions = { onDetails, onEdit, onDelete, disabled }
  return (
    <section className={CARD_CLASSES} aria-label="Liste des retraits" aria-busy={isRefreshing}>
      <SectionHeader icon={MoneyBillTransferIcon} title="Retraits" badgeLabel={badge} />

      {withdrawals.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState icon={MagnifyingGlassIcon} title="Aucun résultat" description="Aucun retrait ne correspond à votre recherche ou à ces filtres." actionLabel="Réinitialiser les filtres" onAction={onReset} />
        ) : (
          <EmptyState icon={MoneyBillTransferIcon} title="Aucun retrait pour le moment" description="Les retraits enregistrés par les associés apparaîtront ici." actionLabel="Enregistrer un retrait" onAction={onAdd} />
        )
      ) : (
        <div className={isRefreshing ? 'opacity-70 transition' : 'transition'}>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-ink-soft">
                <tr>
                  {HEADERS.map((label) => (
                    <th key={label} scope="col" className={`px-3 py-2 font-semibold ${label === 'Montant' || label === 'Actions' ? 'text-right' : ''}`}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="border-t border-line">
                    <td className="whitespace-nowrap px-3 py-3 text-ink">{formatShortDate(withdrawal.withdrawalDate)}</td>
                    <td className="px-3 py-3 font-medium text-ink">{withdrawal.beneficiary.name}</td>
                    <td className="px-3 py-3 text-ink-soft">{withdrawal.recordedBy.name}</td>
                    <td className="min-w-0 px-3 py-3 text-ink"><span className="break-words">{withdrawal.reason || '—'}</span></td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-danger-600">− {formatMoney(withdrawal.amount)}</td>
                    <td className="px-3 py-3"><RowActions withdrawal={withdrawal} {...actions} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-line md:hidden">
            {withdrawals.map((withdrawal) => (
              <li key={withdrawal.id} className="space-y-2 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-ink">{withdrawal.beneficiary.name}</p>
                  <p className="whitespace-nowrap font-bold text-danger-600">− {formatMoney(withdrawal.amount)}</p>
                </div>
                <p className="break-words text-sm text-ink">{withdrawal.reason || '—'}</p>
                <p className="text-xs text-ink-soft">{formatShortDate(withdrawal.withdrawalDate)} · enregistré par {withdrawal.recordedBy.name}</p>
                <RowActions withdrawal={withdrawal} {...actions} />
              </li>
            ))}
          </ul>

          {meta && meta.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3">
              <ActionButton label="Précédent" variant="secondary" size="sm" disabled={meta.page <= 1 || isRefreshing} onClick={() => onPageChange(meta.page - 1)} />
              <p className="text-sm text-ink-soft">Page {meta.page} sur {meta.totalPages}</p>
              <ActionButton label="Suivant" variant="secondary" size="sm" disabled={meta.page >= meta.totalPages || isRefreshing} onClick={() => onPageChange(meta.page + 1)} />
            </nav>
          )}
        </div>
      )}
    </section>
  )
}

export default WithdrawalList
