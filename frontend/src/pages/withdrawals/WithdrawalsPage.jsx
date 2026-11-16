import { ArrowsRotateIcon, CircleCheckIcon } from '../../icons'
import { useMemo, useState } from 'react'
import ActionButton from '../../components/common/ActionButton'
import FormError from '../../components/common/FormError'
import PageHeader from '../../components/common/PageHeader'
import DeleteWithdrawalModal from '../../components/withdrawals/DeleteWithdrawalModal'
import LatestWithdrawals from '../../components/withdrawals/LatestWithdrawals'
import WithdrawalDetailModal from '../../components/withdrawals/WithdrawalDetailModal'
import WithdrawalFiltersBar from '../../components/withdrawals/WithdrawalFiltersBar'
import WithdrawalFormModal from '../../components/withdrawals/WithdrawalFormModal'
import WithdrawalList from '../../components/withdrawals/WithdrawalList'
import WithdrawalStatCards from '../../components/withdrawals/WithdrawalStatCards'
import useAuth from '../../hooks/useAuth'
import useFeedbackMessage from '../../hooks/useFeedbackMessage'
import useWithdrawalsModule from '../../hooks/useWithdrawalsModule'
import { formatDateTime } from '../../utils/activitiesViewModel'
import { todayInDakar } from '../../utils/contributionsViewModel'
import { formatMoney } from '../../utils/treasuryViewModel'
import { availableBalanceOf, availableForEdit, buildCreateValues, buildEditValues, buildSummaryCards, hasActiveFilters } from '../../utils/withdrawalsViewModel'

const TITLE = 'Retraits'
const DESCRIPTION = "Retraits d'argent effectués par les associés sur la trésorerie commune : chaque retrait diminue le solde disponible et reste tracé."

function WithdrawalsPage() {
  const { user } = useAuth()
  const withdrawalsModule = useWithdrawalsModule()
  const { filters, summary, list, mutation, actions } = withdrawalsModule
  const [dialog, setDialog] = useState(null) // { kind: 'create' | 'edit' | 'detail' | 'delete', withdrawal? }
  const [feedback, setFeedback] = useFeedbackMessage()
  const summaryData = summary.data
  const meta = list.data?.meta ?? null
  const todayIso = todayInDakar()

  const view = useMemo(() => {
    const partners = summaryData?.partners ?? []
    return {
      cards: buildSummaryCards(summaryData),
      partnerIds: partners.map((partner) => partner.id),
      formPartnerOptions: [{ value: '', label: 'Choisissez un bénéficiaire' }, ...partners.map((partner) => ({ value: partner.id, label: partner.name }))],
      beneficiaryOptions: [{ value: '', label: 'Tous les bénéficiaires' }, ...partners.map((partner) => ({ value: partner.id, label: partner.name }))],
      authorOptions: [{ value: '', label: 'Tous les auteurs' }, ...partners.map((partner) => ({ value: partner.id, label: partner.name }))],
    }
  }, [summaryData])

  const isBusy = summary.status === 'loading' || summary.status === 'refreshing' || list.status === 'loading' || list.status === 'refreshing'
  const filtersActive = hasActiveFilters(filters)
  const writing = mutation.status === 'submitting'
  const balance = availableBalanceOf(summaryData)

  const open = (kind, withdrawal) => {
    withdrawalsModule.clearMutation()
    setDialog({ kind, withdrawal })
  }
  const close = () => {
    if (writing) return
    withdrawalsModule.clearMutation()
    setDialog(null)
  }
  const done = (result, message) => {
    if (result.ok) {
      setDialog(null)
      setFeedback(message)
    }
  }

  const header = (
    <div className="space-y-2">
      <PageHeader title={TITLE} description={DESCRIPTION} addButtonLabel={summaryData ? 'Enregistrer un retrait' : undefined} onAddClick={() => open('create')} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {summaryData ? `Trésorerie disponible : ${formatMoney(balance)} · dernière actualisation : ${formatDateTime(summaryData.generatedAt)}` : ''}
        </p>
        <ActionButton label="Actualiser" icon={ArrowsRotateIcon} variant="secondary" size="sm" disabled={isBusy} onClick={withdrawalsModule.refresh} />
      </div>
      {feedback && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
          <CircleCheckIcon className="h-4 w-4" aria-hidden="true" /> {feedback}
        </p>
      )}
    </div>
  )

  if (!summaryData) {
    return (
      <div className="space-y-6">
        {header}
        {summary.status === 'error' ? (
          <div className="space-y-2">
            <FormError variant="banner" message={summary.errorMessage} />
            <ActionButton label="Réessayer" icon={ArrowsRotateIcon} size="sm" onClick={withdrawalsModule.refresh} />
          </div>
        ) : (
          <p role="status" className="py-16 text-center text-ink-soft">Chargement des retraits…</p>
        )}
      </div>
    )
  }

  const formContext = (withdrawal) => ({
    todayIso,
    partnerIds: view.partnerIds,
    availableBalance: withdrawal ? availableForEdit(summaryData, withdrawal) : balance,
  })

  return (
    <div className="space-y-6">
      {header}
      {summary.status === 'error' && <FormError variant="banner" message={`${summary.errorMessage} Les chiffres affichés peuvent être périmés.`} />}

      <WithdrawalStatCards cards={view.cards} />
      <LatestWithdrawals withdrawals={summaryData.latest} onSelect={(withdrawal) => open('detail', withdrawal)} />

      <section className="space-y-4">
        <WithdrawalFiltersBar
          filters={filters}
          searchText={withdrawalsModule.searchText}
          onSearchChange={withdrawalsModule.setSearchText}
          onFilterChange={withdrawalsModule.setFilter}
          onReset={withdrawalsModule.resetFilters}
          hasActiveFilters={filtersActive}
          beneficiaryOptions={view.beneficiaryOptions}
          authorOptions={view.authorOptions}
          errorMessage={withdrawalsModule.filtersError}
        />
        {list.status === 'error' && (
          <div className="space-y-2">
            <FormError variant="banner" message={list.errorMessage} />
            <ActionButton label="Réessayer" icon={ArrowsRotateIcon} size="sm" onClick={withdrawalsModule.refresh} />
          </div>
        )}
        {list.data ? (
          <WithdrawalList
            withdrawals={list.data.data.withdrawals}
            meta={meta}
            hasActiveFilters={filtersActive}
            isRefreshing={list.status === 'refreshing' || list.status === 'loading'}
            disabled={writing}
            onPageChange={withdrawalsModule.setPage}
            onDetails={(withdrawal) => open('detail', withdrawal)}
            onEdit={(withdrawal) => open('edit', withdrawal)}
            onDelete={(withdrawal) => open('delete', withdrawal)}
            onReset={withdrawalsModule.resetFilters}
            onAdd={() => open('create')}
          />
        ) : (
          list.status !== 'error' && <p role="status" className="py-8 text-center text-ink-soft">Chargement de la liste…</p>
        )}
      </section>

      {dialog?.kind === 'create' && (
        <WithdrawalFormModal
          initialValues={buildCreateValues(todayIso)}
          context={formContext(null)}
          partnerOptions={view.formPartnerOptions}
          authorName={user?.fullName}
          submission={mutation}
          onSubmit={async (values) => done(await actions.create(values), 'Retrait enregistré : la trésorerie a été mise à jour.')}
          onClose={close}
        />
      )}
      {dialog?.kind === 'edit' && (
        <WithdrawalFormModal
          isEdit
          initialValues={buildEditValues(dialog.withdrawal)}
          context={formContext(dialog.withdrawal)}
          partnerOptions={view.formPartnerOptions}
          authorName={dialog.withdrawal.recordedBy.name}
          submission={mutation}
          onSubmit={async (values) => done(await actions.update(dialog.withdrawal.id, values, dialog.withdrawal), 'Retrait modifié : la trésorerie a été mise à jour.')}
          onClose={close}
        />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteWithdrawalModal
          withdrawal={dialog.withdrawal}
          submission={mutation}
          onConfirm={async (reason) => done(await actions.remove(dialog.withdrawal.id, reason), 'Retrait supprimé : il n’est plus compté dans la trésorerie.')}
          onClose={close}
        />
      )}
      {dialog?.kind === 'detail' && <WithdrawalDetailModal withdrawal={dialog.withdrawal} disabled={writing} onClose={close} onEdit={(withdrawal) => open('edit', withdrawal)} onDelete={(withdrawal) => open('delete', withdrawal)} />}
    </div>
  )
}

export default WithdrawalsPage
