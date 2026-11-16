import { BriefcaseIcon } from '../../icons'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BusinessDetailsHeader from '../../components/business/BusinessDetailsHeader'
import BusinessFinancialCards from '../../components/business/BusinessFinancialCards'
import BusinessFormModal from '../../components/business/BusinessFormModal'
import BusinessInfoCard from '../../components/business/BusinessInfoCard'
import OperationFormModal from '../../components/business/OperationFormModal'
import OperationsHistory from '../../components/business/OperationsHistory'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import EmptyState from '../../components/common/EmptyState'
import FormError from '../../components/common/FormError'
import {
  EXPENSE_CATEGORIES,
  OPERATION_TYPES,
  getAssociate,
  getBusinessCategory,
} from '../../constants/businessSettings'
import useBusinessStore from '../../hooks/useBusinessStore'
import useFeedbackMessage from '../../hooks/useFeedbackMessage'
import { ROUTES } from '../../routes/routePaths'
import {
  getBusinessFinancials,
  getBusinessOperations,
  getEarliestOperationDate,
  listBusinessOperations,
} from '../../utils/businessCalculations'
import { getTodayIsoDate } from '../../utils/contributionCalculations'
import { formatCurrency, formatShortDate } from '../../utils/formatters'

const EXPENSE_CATEGORY_LABELS = Object.fromEntries(EXPENSE_CATEGORIES.map((category) => [category.value, category.label]))

function buildOperationValues(operation, todayIso) {
  if (!operation) return { associateId: '', amount: '', date: todayIso, expenseCategory: '', description: '' }
  return {
    associateId: operation.associateId,
    amount: String(operation.amount),
    date: operation.date,
    expenseCategory: operation.expenseCategory,
    description: operation.description,
  }
}

function buildBusinessValues(business) {
  return {
    name: business.name,
    category: business.category,
    description: business.description,
    launchDate: business.launchDate,
    initialInvestment: String(business.initialInvestment),
    responsibleId: business.responsibleId,
    status: business.status,
  }
}

function BusinessDetailsPage() {
  const { businessId } = useParams()
  const navigate = useNavigate()
  const { businesses, operations, updateBusiness, deleteBusiness, addOperation, updateOperation, deleteOperation } =
    useBusinessStore()
  const [typeFilter, setTypeFilter] = useState('')
  const [modal, setModal] = useState(null)
  const [feedback, setFeedback] = useFeedbackMessage()

  const todayIso = getTodayIsoDate()
  const business = businesses.find((item) => item.id === businessId)

  const data = useMemo(() => {
    if (!business) return null
    const history = listBusinessOperations(operations, business.id, typeFilter).map((operation) => ({
      ...operation,
      associate: getAssociate(operation.associateId) ?? { name: 'Associé inconnu', initials: '?', avatarTone: 'green' },
      categoryLabel: EXPENSE_CATEGORY_LABELS[operation.expenseCategory] ?? '',
    }))
    return {
      financials: getBusinessFinancials(business, operations),
      history,
      operationCount: getBusinessOperations(operations, business.id).length,
      earliestOperationDate: getEarliestOperationDate(operations, business.id),
    }
  }, [business, operations, typeFilter])

  if (!business) {
    return (
      <EmptyState
        icon={BriefcaseIcon}
        title="Business introuvable"
        description="Ce business n'existe pas ou a été supprimé."
        actionLabel="Retour aux business"
        onAction={() => navigate(ROUTES.BUSINESS)}
      />
    )
  }

  const closeModal = () => setModal(null)

  const handleEditBusiness = (values) => {
    updateBusiness(business.id, values)
    setFeedback('Business modifié avec succès.')
    closeModal()
  }

  const handleDeleteBusiness = () => {
    deleteBusiness(business.id)
    closeModal()
    navigate(ROUTES.BUSINESS)
  }

  const handleSubmitOperation = (values) => {
    if (modal.operation) {
      updateOperation(modal.operation.id, values)
      setFeedback('Opération modifiée avec succès.')
    } else {
      addOperation(business.id, values)
      setFeedback('Opération enregistrée avec succès.')
    }
    closeModal()
  }

  const handleDeleteOperation = () => {
    deleteOperation(modal.operation.id)
    setFeedback('Opération supprimée.')
    closeModal()
  }

  const operationType = modal?.kind === 'operation' ? (modal.operation?.type ?? modal.type) : ''

  return (
    <div className="space-y-6">
      <BusinessDetailsHeader
        name={business.name}
        category={business.category}
        status={business.status}
        onEdit={() => setModal({ kind: 'edit-business' })}
        onDelete={() => setModal({ kind: 'delete-business' })}
      />

      <FormError message={feedback} variant="banner" tone="info" />

      <BusinessFinancialCards
        initialInvestment={data.financials.initialInvestment}
        totalInvested={data.financials.totalInvested}
        totalExpenses={data.financials.totalExpenses}
        totalRevenues={data.financials.totalRevenues}
        result={data.financials.result}
      />

      <BusinessInfoCard
        categoryLabel={getBusinessCategory(business.category).label}
        launchDate={business.launchDate}
        responsibleName={getAssociate(business.responsibleId)?.name ?? ''}
        initialInvestment={business.initialInvestment}
        description={business.description}
        cashBalance={data.financials.cashBalance}
      />

      <OperationsHistory
        operations={data.history}
        totalCount={data.operationCount}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        onAdd={(type) => setModal({ kind: 'operation', type, operation: null })}
        onEdit={(operation) => setModal({ kind: 'operation', type: operation.type, operation })}
        onDelete={(operation) => setModal({ kind: 'delete-operation', operation })}
      />

      {modal?.kind === 'edit-business' && (
        <BusinessFormModal
          title="Modifier le business"
          description="Corrigez les informations de cette activité. Les statistiques seront mises à jour."
          submitLabel="Enregistrer les modifications"
          initialValues={buildBusinessValues(business)}
          todayIso={todayIso}
          otherBusinessNames={businesses.filter((item) => item.id !== business.id).map((item) => item.name)}
          earliestOperationDate={data.earliestOperationDate}
          onSubmit={handleEditBusiness}
          onClose={closeModal}
        />
      )}

      {modal?.kind === 'delete-business' && (
        <ConfirmDialog
          idPrefix="delete-business"
          title="Supprimer ce business ?"
          description={`« ${business.name} » et ses ${data.operationCount} opération${data.operationCount > 1 ? 's' : ''} seront supprimés définitivement. Les statistiques seront mises à jour.`}
          confirmLabel="Supprimer"
          onConfirm={handleDeleteBusiness}
          onClose={closeModal}
        />
      )}

      {modal?.kind === 'operation' && (
        <OperationFormModal
          operationType={operationType}
          title={modal.operation ? OPERATION_TYPES[operationType].editLabel : OPERATION_TYPES[operationType].addLabel}
          description={`Cette opération sera associée à « ${business.name} » et comptée dans son résultat.`}
          submitLabel={modal.operation ? 'Enregistrer les modifications' : 'Enregistrer'}
          initialValues={buildOperationValues(modal.operation, todayIso)}
          todayIso={todayIso}
          launchDate={business.launchDate}
          onSubmit={handleSubmitOperation}
          onClose={closeModal}
        />
      )}

      {modal?.kind === 'delete-operation' && (
        <ConfirmDialog
          idPrefix="delete-operation"
          title={OPERATION_TYPES[modal.operation.type].deleteTitle}
          description={`Le montant de ${formatCurrency(modal.operation.amount)} du ${formatShortDate(modal.operation.date)} sera retiré de l'historique et du calcul du résultat.`}
          confirmLabel="Supprimer"
          onConfirm={handleDeleteOperation}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

export default BusinessDetailsPage
