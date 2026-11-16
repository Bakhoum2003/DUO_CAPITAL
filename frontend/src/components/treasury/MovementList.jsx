import { ArrowDownIcon, ArrowUpIcon, ClockRotateLeftIcon, MagnifyingGlassIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { formatShortDate } from '../../utils/formatters'
import { formatMoney, formatMovementAmount } from '../../utils/treasuryViewModel'
import ActionButton from '../common/ActionButton'
import EmptyState from '../common/EmptyState'
import SectionHeader from '../common/SectionHeader'
import MovementTypeBadge from './MovementTypeBadge'

const HEADERS = ['Date', 'Type', 'Catégorie', 'Description', 'Associé', 'Montant', '']

function Amount({ movement }) {
  const isIn = movement.direction === 'IN'
  const Icon = isIn ? ArrowDownIcon : ArrowUpIcon
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap font-bold ${isIn ? 'text-brand-700' : 'text-danger-600'}`}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">{isIn ? 'Entrée de' : 'Sortie de'}</span>
      {formatMovementAmount(movement.amount, movement.direction)}
    </span>
  )
}

function MovementList({ movements, meta, hasActiveFilters, onPageChange, onSelect, onReset, isRefreshing }) {
  const badge = meta ? `${meta.total} mouvement(s) · net ${formatMoney(meta.filtered.net)}` : undefined
  return (
    <section className={CARD_CLASSES} aria-label="Historique des mouvements" aria-busy={isRefreshing}>
      <SectionHeader icon={ClockRotateLeftIcon} title="Historique des mouvements" badgeLabel={badge} />

      {movements.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState icon={MagnifyingGlassIcon} title="Aucun résultat" description="Aucun mouvement ne correspond à votre recherche ou à ces filtres." actionLabel="Réinitialiser les filtres" onAction={onReset} />
        ) : (
          <EmptyState icon={ClockRotateLeftIcon} title="Aucun mouvement pour le moment" description="Les cotisations, recettes, investissements, dépenses et retraits apparaîtront ici dès qu'ils seront enregistrés." />
        )
      ) : (
        <div className={isRefreshing ? 'opacity-70 transition' : 'transition'}>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-ink-soft">
                <tr>
                  {HEADERS.map((label, index) => (
                    <th key={label || index} scope="col" className={`px-3 py-2 font-semibold ${label === 'Montant' ? 'text-right' : ''}`}>
                      {label || <span className="sr-only">Détails</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={`${movement.type}-${movement.id}`} className="border-t border-line">
                    <td className="whitespace-nowrap px-3 py-3 text-ink">{formatShortDate(movement.date)}</td>
                    <td className="px-3 py-3"><MovementTypeBadge type={movement.type} /></td>
                    <td className="px-3 py-3 text-ink-soft">{movement.category || '—'}</td>
                    <td className="min-w-0 px-3 py-3 text-ink">
                      <p className="break-words">{movement.description || '—'}</p>
                      {movement.activity && <p className="text-xs text-ink-soft">{movement.activity.name}</p>}
                    </td>
                    <td className="px-3 py-3 text-ink-soft">{movement.partner?.name ?? '—'}</td>
                    <td className="px-3 py-3 text-right"><Amount movement={movement} /></td>
                    <td className="px-3 py-3 text-right"><ActionButton label="Détails" variant="secondary" size="sm" onClick={() => onSelect(movement)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-line md:hidden">
            {movements.map((movement) => (
              <li key={`${movement.type}-${movement.id}`} className="py-3">
                <button type="button" onClick={() => onSelect(movement)} className="block w-full text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30">
                  <div className="flex items-start justify-between gap-3">
                    <MovementTypeBadge type={movement.type} />
                    <Amount movement={movement} />
                  </div>
                  <p className="mt-1.5 break-words text-sm text-ink">{movement.description || '—'}</p>
                  <p className="text-xs text-ink-soft">
                    {formatShortDate(movement.date)}
                    {movement.partner ? ` · ${movement.partner.name}` : ''}
                    {movement.category ? ` · ${movement.category}` : ''}
                  </p>
                </button>
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

export default MovementList
