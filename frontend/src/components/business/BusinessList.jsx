import { BriefcaseIcon, MagnifyingGlassIcon, PlusIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { getBusinessDetailsPath } from '../../routes/routePaths'
import EmptyState from '../common/EmptyState'
import SectionHeader from '../common/SectionHeader'
import BusinessCard from './BusinessCard'
import BusinessFilters from './BusinessFilters'

function BusinessList({
  businesses,
  totalCount,
  associateNames,
  filters,
  onFilterChange,
  onResetFilters,
  hasActiveFilters,
  categoryOptions,
  statusOptions,
  onAdd,
}) {
  const badgeLabel =
    businesses.length === totalCount ? `${totalCount} business` : `${businesses.length} sur ${totalCount}`

  return (
    <section className={CARD_CLASSES} aria-label="Liste des business">
      <SectionHeader icon={BriefcaseIcon} title="Mes business" badgeLabel={badgeLabel} />

      {totalCount === 0 ? (
        <EmptyState
          icon={BriefcaseIcon}
          title="Aucun business enregistré"
          description="Ajoutez votre première activité commerciale pour suivre ses investissements, dépenses et recettes."
          actionLabel="Ajouter un business"
          actionIcon={PlusIcon}
          onAction={onAdd}
        />
      ) : (
        <>
          <BusinessFilters
            filters={filters}
            onFilterChange={onFilterChange}
            onReset={onResetFilters}
            hasActiveFilters={hasActiveFilters}
            categoryOptions={categoryOptions}
            statusOptions={statusOptions}
          />

          {businesses.length === 0 ? (
            <EmptyState
              icon={MagnifyingGlassIcon}
              title="Aucun résultat"
              description="Aucun business ne correspond à votre recherche ou à vos filtres."
              actionLabel="Réinitialiser les filtres"
              onAction={onResetFilters}
            />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {businesses.map((business) => (
                <BusinessCard
                  key={business.id}
                  to={getBusinessDetailsPath(business.id)}
                  name={business.name}
                  category={business.category}
                  launchDate={business.launchDate}
                  responsibleName={associateNames[business.responsibleId] ?? ''}
                  status={business.status}
                  totalInvested={business.financials.totalInvested}
                  totalExpenses={business.financials.totalExpenses}
                  totalRevenues={business.financials.totalRevenues}
                  result={business.financials.result}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

export default BusinessList
