import { ArrowDownIcon, ArrowUpIcon, ClockRotateLeftIcon, MagnifyingGlassIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { formatShortDate } from '../../utils/formatters'
import { PAGE_SIZE_OPTIONS } from '../../utils/historyViewModel'
import { DIRECTION_LABELS, formatMoney, formatMovementAmount } from '../../utils/treasuryViewModel'
import ActionButton from '../common/ActionButton'
import EmptyState from '../common/EmptyState'
import SectionHeader from '../common/SectionHeader'
import SelectField from '../common/SelectField'
import MovementTypeBadge from '../treasury/MovementTypeBadge'

const HEADERS = ['Date', 'Description', 'Type', 'Associé', 'Activité', 'Direction', 'Montant', 'Action']
const LIMIT_OPTIONS = PAGE_SIZE_OPTIONS.map((size) => ({ value: String(size), label: `${size} par page` }))

function Direction({ operation }) {
  const isIn = operation.direction === 'IN'
  const Icon = isIn ? ArrowDownIcon : ArrowUpIcon
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium ${isIn ? 'text-brand-700' : 'text-danger-600'}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {DIRECTION_LABELS[operation.direction] ?? '—'}
    </span>
  )
}

const Amount = ({ operation }) => (
  <span className={`whitespace-nowrap font-bold ${operation.direction === 'IN' ? 'text-brand-700' : 'text-danger-600'}`}>{formatMovementAmount(operation.amount, operation.direction)}</span>
)

/**
 * Liste des opérations (tableau sur grand écran, cartes sur mobile), pagination et taille de page. Lecture seule.
 * Props : operations, meta { page, limit, total, totalPages, filtered }, hasActiveFilters, isRefreshing,
 * onPageChange, onLimitChange, onSelect(operation), onReset.
 */
function OperationsList({ operations, meta, hasActiveFilters, isRefreshing, onPageChange, onLimitChange, onSelect, onReset }) {
  const badge = meta ? `${meta.total} opération(s) · net ${formatMoney(meta.filtered.net)}` : undefined
  return (
    <section className={CARD_CLASSES} aria-label="Opérations" aria-busy={isRefreshing}>
      <SectionHeader icon={ClockRotateLeftIcon} title="Opérations" badgeLabel={badge} />

      {operations.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState icon={MagnifyingGlassIcon} title="Aucun résultat" description="Aucune opération ne correspond à votre recherche ou à ces filtres." actionLabel="Réinitialiser les filtres" onAction={onReset} />
        ) : (
          <EmptyState icon={ClockRotateLeftIcon} title="Aucun historique pour le moment" description="Les cotisations, revenus, investissements, dépenses et retraits apparaîtront ici dès qu'ils seront enregistrés." />
        )
      ) : (
        <div className={isRefreshing ? 'opacity-70 transition' : 'transition'}>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-ink-soft">
                <tr>
                  {HEADERS.map((label) => (
                    <th key={label} scope="col" className={`px-3 py-2 font-semibold ${label === 'Montant' || label === 'Action' ? 'text-right' : ''}`}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operations.map((operation) => (
                  <tr key={`${operation.type}-${operation.id}`} className="border-t border-line">
                    <td className="whitespace-nowrap px-3 py-3 text-ink">{formatShortDate(operation.date)}</td>
                    <td className="min-w-0 px-3 py-3 text-ink"><span className="break-words">{operation.description || '—'}</span></td>
                    <td className="px-3 py-3"><MovementTypeBadge type={operation.type} /></td>
                    <td className="px-3 py-3 text-ink-soft">{operation.partner?.name ?? '—'}</td>
                    <td className="px-3 py-3 text-ink-soft">{operation.activity?.name ?? '—'}</td>
                    <td className="px-3 py-3"><Direction operation={operation} /></td>
                    <td className="px-3 py-3 text-right"><Amount operation={operation} /></td>
                    <td className="px-3 py-3 text-right"><ActionButton label="Détails" variant="secondary" size="sm" onClick={() => onSelect(operation)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-line md:hidden">
            {operations.map((operation) => (
              <li key={`${operation.type}-${operation.id}`} className="py-3">
                <button type="button" onClick={() => onSelect(operation)} className="block w-full text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30">
                  <div className="flex items-start justify-between gap-3">
                    <MovementTypeBadge type={operation.type} />
                    <Amount operation={operation} />
                  </div>
                  <p className="mt-1.5 break-words text-sm text-ink">{operation.description || '—'}</p>
                  <p className="text-xs text-ink-soft">
                    {formatShortDate(operation.date)}
                    {operation.partner ? ` · ${operation.partner.name}` : ''}
                    {operation.activity ? ` · ${operation.activity.name}` : ''}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <ActionButton label="Précédent" variant="secondary" size="sm" disabled={!meta || meta.page <= 1 || isRefreshing} onClick={() => onPageChange(meta.page - 1)} />
            <p className="text-sm text-ink-soft">Page {meta?.page ?? 1} sur {meta?.totalPages ?? 1}</p>
            <ActionButton label="Suivant" variant="secondary" size="sm" disabled={!meta || meta.page >= meta.totalPages || isRefreshing} onClick={() => onPageChange(meta.page + 1)} />
            <div className="w-full sm:w-40">
              <SelectField id="history-limit" label="Nombre d'opérations par page" value={String(meta?.limit ?? '')} onChange={(event) => onLimitChange(Number(event.target.value))} options={LIMIT_OPTIONS} />
            </div>
          </nav>
        </div>
      )}
    </section>
  )
}

export default OperationsList
