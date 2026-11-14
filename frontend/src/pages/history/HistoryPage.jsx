import { ArrowsRotateIcon } from '../../icons'
import { useMemo, useState } from 'react'
import ActionButton from '../../components/common/ActionButton'
import FormError from '../../components/common/FormError'
import PageHeader from '../../components/common/PageHeader'
import OperationDetailModal from '../../components/history/OperationDetailModal'
import OperationsFiltersBar from '../../components/history/OperationsFiltersBar'
import OperationsList from '../../components/history/OperationsList'
import OperationsStatCards from '../../components/history/OperationsStatCards'
import useHistory from '../../hooks/useHistory'
import { formatDateTime } from '../../utils/activitiesViewModel'
import { buildFilterOptions, buildSummaryCards, hasActiveFilters } from '../../utils/historyViewModel'

const TITLE = 'Historique'
const DESCRIPTION = "Toutes les opérations financières réellement enregistrées : cotisations, revenus, investissements, dépenses et retraits. Consultation seule : chaque opération se gère dans son module."

/**
 * Page « Historique » : totaux, recherche, filtres combinables, tri, pagination et détail. Lecture seule.
 * Toutes les données viennent de l'API (le serveur calcule tout) ; aucune donnée fictive ; chargement, erreur,
 * aucun historique et aucun résultat sont distincts, et une erreur ne remplace jamais les chiffres par des données locales.
 */
function HistoryPage() {
  const history = useHistory()
  const { filters, summary, list } = history
  const [selected, setSelected] = useState(null)
  const summaryData = summary.data
  const meta = list.data?.meta ?? null

  const cards = useMemo(() => buildSummaryCards(summaryData), [summaryData])
  const options = useMemo(() => buildFilterOptions(summaryData), [summaryData])
  const isBusy = summary.status === 'loading' || summary.status === 'refreshing' || list.status === 'loading' || list.status === 'refreshing'
  const filtersActive = hasActiveFilters(filters)

  const header = (
    <div className="space-y-2">
      <PageHeader title={TITLE} description={DESCRIPTION} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">{summaryData ? `Dernière actualisation : ${formatDateTime(summaryData.generatedAt)}` : ''}</p>
        <ActionButton label="Actualiser" icon={ArrowsRotateIcon} variant="secondary" size="sm" disabled={isBusy} onClick={history.refresh} />
      </div>
    </div>
  )

  // Première lecture : aucune donnée du serveur n'est encore disponible.
  if (!summaryData) {
    return (
      <div className="space-y-6">
        {header}
        {summary.status === 'error' ? (
          <div className="space-y-2">
            <FormError variant="banner" message={summary.errorMessage} />
            <ActionButton label="Réessayer" icon={ArrowsRotateIcon} size="sm" onClick={history.refresh} />
          </div>
        ) : (
          <p role="status" className="py-16 text-center text-ink-soft">Chargement de l'historique…</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {header}
      {summary.status === 'error' && <FormError variant="banner" message={`${summary.errorMessage} Les chiffres affichés peuvent être périmés.`} />}

      <OperationsStatCards main={cards.main} extra={cards.extra} />
      {summaryData.notices.map((notice) => (
        <FormError key={notice.code} variant="banner" tone="info" message={notice.message} />
      ))}

      <section className="space-y-4">
        <OperationsFiltersBar
          filters={filters}
          searchText={history.searchText}
          onSearchChange={history.setSearchText}
          onFilterChange={history.setFilter}
          onReset={history.resetFilters}
          hasActiveFilters={filtersActive}
          partnerOptions={options.partners}
          activityOptions={options.activities}
          errorMessage={history.filtersError}
        />
        {list.status === 'error' && (
          <div className="space-y-2">
            <FormError variant="banner" message={list.errorMessage} />
            <ActionButton label="Réessayer" icon={ArrowsRotateIcon} size="sm" onClick={history.refresh} />
          </div>
        )}
        {list.data ? (
          <OperationsList
            operations={list.data.data.operations}
            meta={meta}
            hasActiveFilters={filtersActive}
            isRefreshing={list.status === 'refreshing' || list.status === 'loading'}
            onPageChange={history.setPage}
            onLimitChange={(limit) => history.setFilter('limit', limit)}
            onSelect={setSelected}
            onReset={history.resetFilters}
          />
        ) : (
          list.status !== 'error' && <p role="status" className="py-8 text-center text-ink-soft">Chargement des opérations…</p>
        )}
      </section>

      {selected && <OperationDetailModal operation={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

export default HistoryPage
