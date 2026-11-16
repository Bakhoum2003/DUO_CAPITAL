import { ClockRotateLeftIcon, MagnifyingGlassIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import EmptyState from '../common/EmptyState'
import SectionHeader from '../common/SectionHeader'
import HistoryFilters from './HistoryFilters'
import HistoryMobileItem from './HistoryMobileItem'
import HistoryTable from './HistoryTable'

function HistoryList({
  entries,
  totalCount,
  filters,
  onFilterChange,
  onResetFilters,
  hasActiveFilters,
  periodError,
  typeOptions,
  associateOptions,
  businessOptions,
  onShowDetails,
}) {
  const badgeLabel = entries.length === totalCount ? `${totalCount} mouvements` : `${entries.length} sur ${totalCount}`

  return (
    <section className={CARD_CLASSES} aria-label="Liste des mouvements">
      <SectionHeader icon={ClockRotateLeftIcon} title="Mouvements financiers" badgeLabel={badgeLabel} />

      <HistoryFilters
        filters={filters}
        onFilterChange={onFilterChange}
        onReset={onResetFilters}
        hasActiveFilters={hasActiveFilters}
        typeOptions={typeOptions}
        associateOptions={associateOptions}
        businessOptions={businessOptions}
        periodError={periodError}
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={MagnifyingGlassIcon}
          title="Aucun mouvement trouvé"
          description={
            totalCount === 0
              ? "Les mouvements d'argent apparaîtront ici dès qu'une cotisation ou une opération sera enregistrée."
              : 'Aucun mouvement ne correspond à votre recherche ou à vos filtres.'
          }
          actionLabel={hasActiveFilters ? 'Réinitialiser les filtres' : undefined}
          onAction={onResetFilters}
        />
      ) : (
        <>
          <HistoryTable entries={entries} onShowDetails={onShowDetails} />

          <ul className="space-y-3 md:hidden">
            {entries.map((entry) => (
              <HistoryMobileItem
                key={entry.id}
                type={entry.type}
                direction={entry.direction}
                amount={entry.amount}
                date={entry.date}
                description={entry.description}
                businessName={entry.businessName}
                associateName={entry.associateName}
                onShowDetails={() => onShowDetails(entry)}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export default HistoryList
