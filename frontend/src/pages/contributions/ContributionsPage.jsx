import { ArrowsRotateIcon } from '../../icons'
import { useEffect, useMemo, useState } from 'react'
import ActionButton from '../../components/common/ActionButton'
import FormError from '../../components/common/FormError'
import ContributionFiltersBar from '../../components/contributions/ContributionFiltersBar'
import ContributionLedger from '../../components/contributions/ContributionLedger'
import ContributionStatCards from '../../components/contributions/ContributionStatCards'
import ContributionsPageHeader from '../../components/contributions/ContributionsPageHeader'
import MonthlyTrackingTable from '../../components/contributions/MonthlyTrackingTable'
import PartnerTrackingSection from '../../components/contributions/PartnerTrackingSection'
import RecordContributionModal from '../../components/contributions/RecordContributionModal'
import useAuth from '../../hooks/useAuth'
import useContributionsModule from '../../hooks/useContributionsModule'
import {
  buildMonthRows,
  buildPartnerProgress,
  buildPeriodOptions,
  buildStatCards,
  hasActiveFilters as detectActiveFilters,
  todayInDakar,
} from '../../utils/contributionsViewModel'

const FEEDBACK_MS = 4000

/**
 * Page « Cotisations » : statistiques, suivi par associé et par mois, historique filtrable et enregistrement.
 * Toutes les données viennent de l'API ; aucune donnée fictive ; les états chargement / erreur / vide sont distincts.
 */
function ContributionsPage() {
  const { user } = useAuth()
  const contributions = useContributionsModule()
  const { filters, filtersError, summary, list, submission } = contributions
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (!feedback) return undefined
    const timerId = setTimeout(() => setFeedback(''), FEEDBACK_MS)
    return () => clearTimeout(timerId)
  }, [feedback])

  const todayIso = todayInDakar()
  const summaryData = summary.data
  const view = useMemo(() => {
    if (!summaryData) return null
    const currentPeriod = todayIso.slice(0, 7)
    const periodOptions = buildPeriodOptions(summaryData.fundStartPeriod, currentPeriod)
    const years = [...new Set(periodOptions.map((option) => option.value.slice(0, 4)))]
    return {
      cards: buildStatCards(summaryData),
      partners: summaryData.partners.map(buildPartnerProgress),
      months: buildMonthRows(summaryData),
      periodOptions,
      partnerOptions: [{ value: '', label: 'Tous les associés' }, ...summaryData.partners.map((p) => ({ value: p.partnerId, label: p.name }))],
      filterPeriodOptions: [{ value: '', label: 'Tous les mois' }, ...periodOptions],
      yearOptions: [{ value: '', label: 'Toutes les années' }, ...years.map((year) => ({ value: year, label: year }))],
      defaultPartnerId: summaryData.partners.find((p) => p.partnerNumber === user?.partnerNumber)?.partnerId ?? '',
    }
  }, [summaryData, todayIso, user?.partnerNumber])

  const handleRecord = async (values, options) => {
    const succeeded = await contributions.record(values, options)
    if (succeeded) {
      setIsModalOpen(false)
      setFeedback('Cotisation enregistrée avec succès.')
    }
  }
  const openModal = () => {
    contributions.resetSubmission()
    setIsModalOpen(true)
  }

  if (!summaryData) {
    return (
      <div className="space-y-4">
        <ContributionsPageHeader title="Cotisations" description="Suivez les cotisations mensuelles des deux associés." />
        {summary.status === 'error' ? (
          <div className="space-y-3">
            <FormError variant="banner" message={summary.errorMessage} />
            <ActionButton label="Réessayer" icon={ArrowsRotateIcon} onClick={contributions.refresh} />
          </div>
        ) : (
          <p role="status" className="py-16 text-center text-ink-soft">Chargement des cotisations…</p>
        )}
      </div>
    )
  }

  const isBusy = summary.status === 'refreshing' || list.status === 'refreshing' || list.status === 'loading'
  const ledger = list.data

  return (
    <div className="space-y-6">
      <ContributionsPageHeader
        title="Cotisations"
        description="Suivez les cotisations mensuelles de chaque associé et enregistrez chaque versement réellement reçu."
        addButtonLabel="Enregistrer une cotisation"
        onAddClick={openModal}
      />

      <FormError variant="banner" tone="info" message={feedback} />
      {summary.status === 'error' && <FormError variant="banner" message={`${summary.errorMessage} Les chiffres affichés peuvent être périmés.`} />}
      {summaryData.unavailableReason && <FormError variant="banner" tone="info" message={summaryData.unavailableReason} />}
      {!summaryData.fundStarted && summaryData.expectedAvailable && (
        <FormError variant="banner" tone="info" message={`Le fonds démarre en ${summaryData.fundStartPeriod} : aucun mois n'est encore dû.`} />
      )}

      <div className="flex justify-end">
        <ActionButton label="Actualiser" icon={ArrowsRotateIcon} variant="secondary" size="sm" disabled={isBusy} onClick={contributions.refresh} />
      </div>

      <ContributionStatCards cards={view.cards} />
      <PartnerTrackingSection partners={view.partners} />
      <MonthlyTrackingTable rows={view.months} partners={summaryData.partners} />

      <section className="space-y-3">
        <ContributionFiltersBar
          filters={filters}
          onFilterChange={contributions.setFilter}
          onReset={contributions.resetFilters}
          hasActiveFilters={detectActiveFilters(filters)}
          partnerOptions={view.partnerOptions}
          periodOptions={view.filterPeriodOptions}
          yearOptions={view.yearOptions}
          errorMessage={filtersError}
        />
        {list.status === 'error' && (
          <div className="space-y-2">
            <FormError variant="banner" message={list.errorMessage} />
            <ActionButton label="Réessayer" icon={ArrowsRotateIcon} size="sm" onClick={contributions.refresh} />
          </div>
        )}
        {ledger ? (
          <ContributionLedger
            contributions={ledger.data.contributions}
            meta={ledger.meta}
            hasActiveFilters={detectActiveFilters(filters)}
            onPageChange={contributions.setPage}
            onAdd={openModal}
            isRefreshing={list.status === 'refreshing'}
          />
        ) : (
          list.status !== 'error' && <p role="status" className="py-8 text-center text-ink-soft">Chargement de l'historique…</p>
        )}
      </section>

      {isModalOpen && (
        <RecordContributionModal
          onClose={() => setIsModalOpen(false)}
          initialValues={{ partnerId: view.defaultPartnerId, amount: '', contributionDate: todayIso, period: view.periodOptions[0]?.value ?? '', note: '' }}
          context={{ todayIso, fundStartPeriod: summaryData.fundStartPeriod, partnerIds: summaryData.partners.map((p) => p.partnerId) }}
          partnerOptions={[{ value: '', label: 'Choisir un associé' }, ...summaryData.partners.map((p) => ({ value: p.partnerId, label: p.name }))]}
          periodOptions={[{ value: '', label: summaryData.expectedAvailable && view.periodOptions.length === 0 ? 'Le fonds n’a pas démarré' : 'Choisir un mois' }, ...view.periodOptions]}
          submission={submission}
          onSubmit={handleRecord}
        />
      )}
    </div>
  )
}

export default ContributionsPage
