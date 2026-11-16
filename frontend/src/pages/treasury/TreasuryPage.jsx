import { ArrowsRotateIcon } from '../../icons'
import { useMemo, useState } from 'react'
import ActionButton from '../../components/common/ActionButton'
import FormError from '../../components/common/FormError'
import PageHeader from '../../components/common/PageHeader'
import MovementDetailModal from '../../components/treasury/MovementDetailModal'
import MovementFiltersBar from '../../components/treasury/MovementFiltersBar'
import MovementList from '../../components/treasury/MovementList'
import TreasuryEvolution from '../../components/treasury/TreasuryEvolution'
import TreasuryFormula from '../../components/treasury/TreasuryFormula'
import TreasuryStatCards from '../../components/treasury/TreasuryStatCards'
import useTreasuryModule from '../../hooks/useTreasuryModule'
import { formatDateTime } from '../../utils/activitiesViewModel'
import { buildFormulaRows, buildSpendingRows, buildSummaryCards, formatLastMovement, formatMoney, hasActiveFilters } from '../../utils/treasuryViewModel'

const TITLE = 'Trésorerie'
const DESCRIPTION = 'Situation financière réelle du fonds commun : solde disponible, entrées, sorties et historique de chaque mouvement.'

/**
 * Page « Trésorerie » : synthèse, calcul du solde, évolution et historique filtrable. Lecture seule.
 * Toutes les données viennent de l'API (le serveur calcule tout) ; aucune donnée fictive ; chargement, erreur,
 * aucun mouvement et aucun résultat sont distincts, et une erreur ne remplace jamais les chiffres par des données locales.
 */
function TreasuryPage() {
  const treasury = useTreasuryModule()
  const { filters, summary, list } = treasury
  const [selected, setSelected] = useState(null)
  const summaryData = summary.data
  const meta = list.data?.meta ?? null

  const view = useMemo(
    () => ({
      cards: buildSummaryCards(summaryData),
      spending: buildSpendingRows(summaryData),
      formula: buildFormulaRows(summaryData?.components),
      categoryOptions: [{ value: '', label: 'Toutes les catégories' }, ...(meta?.categories ?? []).map((category) => ({ value: category, label: category }))],
      partnerOptions: [{ value: '', label: 'Tous les associés' }, ...(summaryData?.partners ?? []).map((partner) => ({ value: partner.id, label: partner.name }))],
    }),
    [summaryData, meta?.categories],
  )

  const isBusy = summary.status === 'loading' || summary.status === 'refreshing' || list.status === 'loading' || list.status === 'refreshing'
  const filtersActive = hasActiveFilters(filters)
  const lastUpdate = summaryData ? `Dernière actualisation : ${formatDateTime(summaryData.generatedAt)}` : ''

  const header = (
    <div className="space-y-2">
      <PageHeader title={TITLE} description={DESCRIPTION} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">{lastUpdate}</p>
        <ActionButton label="Actualiser" icon={ArrowsRotateIcon} variant="secondary" size="sm" disabled={isBusy} onClick={treasury.refresh} />
      </div>
    </div>
  )

  if (!summaryData) {
    return (
      <div className="space-y-6">
        {header}
        {summary.status === 'error' ? (
          <FormError variant="banner" message={summary.errorMessage} />
        ) : (
          <p role="status" className="py-16 text-center text-ink-soft">Chargement de la trésorerie…</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {header}

      {summary.status === 'error' && <FormError variant="banner" message={`${summary.errorMessage} Les chiffres affichés peuvent être périmés.`} />}
      <TreasuryStatCards cards={view.cards} spendingRows={view.spending} />
      <p className="text-sm text-ink-soft">
        {summaryData.movementsCount} mouvement(s) comptabilisé(s) · dernier mouvement : {formatLastMovement(summaryData.lastMovementDate)}
      </p>

      <div className="grid gap-6 xl:grid-cols-2">
        <TreasuryFormula rows={view.formula} balanceLabel={formatMoney(summaryData.balance)} notices={summaryData.notices} />
        <TreasuryEvolution points={summaryData.evolution.points} />
      </div>

      <section className="space-y-4">
        <MovementFiltersBar
          filters={filters}
          searchText={treasury.searchText}
          onSearchChange={treasury.setSearchText}
          onFilterChange={treasury.setFilter}
          onReset={treasury.resetFilters}
          hasActiveFilters={filtersActive}
          categoryOptions={view.categoryOptions}
          partnerOptions={view.partnerOptions}
          errorMessage={treasury.filtersError}
        />
        {list.status === 'error' && (
          <div className="space-y-2">
            <FormError variant="banner" message={list.errorMessage} />
            <ActionButton label="Réessayer" icon={ArrowsRotateIcon} size="sm" onClick={treasury.refresh} />
          </div>
        )}
        {list.data ? (
          <MovementList
            movements={list.data.data.movements}
            meta={meta}
            hasActiveFilters={filtersActive}
            onPageChange={treasury.setPage}
            onSelect={setSelected}
            onReset={treasury.resetFilters}
            isRefreshing={list.status === 'refreshing' || list.status === 'loading'}
          />
        ) : (
          list.status !== 'error' && <p role="status" className="py-8 text-center text-ink-soft">Chargement de l'historique…</p>
        )}
      </section>

      {selected && <MovementDetailModal movement={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

export default TreasuryPage
