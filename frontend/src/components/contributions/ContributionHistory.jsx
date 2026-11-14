import { ClockRotateLeftIcon, MagnifyingGlassIcon, PlusIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { formatCurrency } from '../../utils/formatters'
import EmptyState from '../common/EmptyState'
import SectionHeader from '../common/SectionHeader'
import ContributionFilters from './ContributionFilters'
import ContributionMobileItem from './ContributionMobileItem'
import ContributionTable from './ContributionTable'

/**
 * Section « Historique des cotisations » : filtres, tableau (ou cartes sur mobile),
 * états vides et total des cotisations affichées.
 *
 * Props :
 * - contributions : cotisations à afficher (déjà filtrées et triées), avec leur `associate`
 * - totalCount : nombre de cotisations avant filtrage
 * - displayedTotalAmount : total (FCFA) des cotisations affichées
 * - filters, onFilterChange, onResetFilters, hasActiveFilters : état des filtres (voir ContributionFilters)
 * - associateOptions, monthOptions : options des listes déroulantes
 * - onAdd : fonction appelée pour ouvrir la fenêtre d'ajout (état vide)
 * - onEdit, onDelete : fonctions appelées avec la cotisation concernée
 */
function ContributionHistory({
  contributions,
  totalCount,
  displayedTotalAmount,
  filters,
  onFilterChange,
  onResetFilters,
  hasActiveFilters,
  associateOptions,
  monthOptions,
  onAdd,
  onEdit,
  onDelete,
}) {
  const hasNoContributionAtAll = totalCount === 0
  const badgeLabel =
    contributions.length === totalCount
      ? `${totalCount} cotisation${totalCount > 1 ? 's' : ''}`
      : `${contributions.length} sur ${totalCount}`

  return (
    <section className={CARD_CLASSES} aria-label="Historique des cotisations">
      <SectionHeader
        icon={ClockRotateLeftIcon}
        iconClassName="text-brand-600"
        title="Historique des cotisations"
        badgeLabel={badgeLabel}
      />

      {hasNoContributionAtAll ? (
        <EmptyState
          icon={ClockRotateLeftIcon}
          title="Aucune cotisation enregistrée"
          description="Les cotisations de Mohamed et Cheikh apparaîtront ici dès que vous en aurez enregistré une."
          actionLabel="Ajouter une cotisation"
          actionIcon={PlusIcon}
          onAction={onAdd}
        />
      ) : (
        <>
          <ContributionFilters
            filters={filters}
            onFilterChange={onFilterChange}
            onReset={onResetFilters}
            hasActiveFilters={hasActiveFilters}
            associateOptions={associateOptions}
            monthOptions={monthOptions}
          />

          {contributions.length === 0 ? (
            <EmptyState
              icon={MagnifyingGlassIcon}
              title="Aucun résultat"
              description="Aucune cotisation ne correspond à votre recherche ou à vos filtres."
              actionLabel="Réinitialiser les filtres"
              onAction={onResetFilters}
            />
          ) : (
            <>
              <ContributionTable contributions={contributions} onEdit={onEdit} onDelete={onDelete} />

              <ul className="space-y-3 md:hidden">
                {contributions.map((contribution) => (
                  <ContributionMobileItem
                    key={contribution.id}
                    associateName={contribution.associate.name}
                    initials={contribution.associate.initials}
                    avatarTone={contribution.associate.avatarTone}
                    amount={contribution.amount}
                    date={contribution.date}
                    description={contribution.description}
                    onEdit={() => onEdit(contribution)}
                    onDelete={() => onDelete(contribution)}
                  />
                ))}
              </ul>

              <p className="mt-4 text-right text-sm text-ink-soft">
                Total affiché : <span className="font-extrabold text-ink">{formatCurrency(displayedTotalAmount)}</span>
              </p>
            </>
          )}
        </>
      )}
    </section>
  )
}

export default ContributionHistory
