import { useMemo, useState } from 'react'
import BusinessFormModal from '../../components/business/BusinessFormModal'
import BusinessList from '../../components/business/BusinessList'
import BusinessSummaryCards from '../../components/business/BusinessSummaryCards'
import FormError from '../../components/common/FormError'
import PageHeader from '../../components/common/PageHeader'
import {
  BUSINESS_ASSOCIATES,
  BUSINESS_CATEGORIES,
  BUSINESS_STATUS_OPTIONS,
} from '../../constants/businessSettings'
import useBusinessFilters from '../../hooks/useBusinessFilters'
import useBusinessStore from '../../hooks/useBusinessStore'
import useFeedbackMessage from '../../hooks/useFeedbackMessage'
import {
  attachFinancials,
  filterBusinesses,
  getGlobalTotals,
  sortBusinesses,
} from '../../utils/businessCalculations'
import { getTodayIsoDate } from '../../utils/contributionCalculations'

const CATEGORY_OPTIONS = [
  { value: '', label: 'Toutes les catégories' },
  ...BUSINESS_CATEGORIES.map((category) => ({ value: category.value, label: category.label })),
]
const STATUS_OPTIONS = [{ value: '', label: 'Tous les statuts' }, ...BUSINESS_STATUS_OPTIONS]
const CATEGORY_LABELS = Object.fromEntries(BUSINESS_CATEGORIES.map((category) => [category.value, category.label]))
const ASSOCIATE_NAMES = Object.fromEntries(BUSINESS_ASSOCIATES.map((associate) => [associate.id, associate.name]))

function BusinessPage() {
  const { businesses, operations, errorMessage, addBusiness } = useBusinessStore()
  const { filters, setFilter, resetFilters, hasActiveFilters } = useBusinessFilters()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [feedback, setFeedback] = useFeedbackMessage()

  const todayIso = getTodayIsoDate()

  const data = useMemo(() => {
    const withFinancials = attachFinancials(businesses, operations)
    const visible = sortBusinesses(
      filterBusinesses(withFinancials, filters, CATEGORY_LABELS, ASSOCIATE_NAMES),
      filters.sortOrder,
    )
    return { visible, totals: getGlobalTotals(businesses, operations) }
  }, [businesses, operations, filters])

  const handleAddBusiness = (values) => {
    addBusiness(values)
    resetFilters()
    setFeedback('Business ajouté avec succès.')
    setIsAddModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business"
        description="Gérez vos activités commerciales et suivez leurs performances."
        addButtonLabel="Ajouter un business"
        onAddClick={() => setIsAddModalOpen(true)}
      />

      <FormError message={errorMessage} variant="banner" />
      <FormError message={feedback} variant="banner" tone="info" />

      <BusinessSummaryCards
        businessCount={data.totals.businessCount}
        totalInvested={data.totals.totalInvested}
        totalRevenues={data.totals.totalRevenues}
        result={data.totals.result}
      />

      <BusinessList
        businesses={data.visible}
        totalCount={businesses.length}
        associateNames={ASSOCIATE_NAMES}
        filters={filters}
        onFilterChange={setFilter}
        onResetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters}
        categoryOptions={CATEGORY_OPTIONS}
        statusOptions={STATUS_OPTIONS}
        onAdd={() => setIsAddModalOpen(true)}
      />

      {isAddModalOpen && (
        <BusinessFormModal
          title="Ajouter un business"
          description="Renseignez la nouvelle activité. Elle apparaîtra immédiatement dans la liste."
          submitLabel="Enregistrer"
          initialValues={{
            name: '',
            category: '',
            description: '',
            launchDate: todayIso,
            initialInvestment: '',
            responsibleId: '',
            status: 'ongoing',
          }}
          todayIso={todayIso}
          otherBusinessNames={businesses.map((business) => business.name)}
          earliestOperationDate=""
          onSubmit={handleAddBusiness}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
    </div>
  )
}

export default BusinessPage
