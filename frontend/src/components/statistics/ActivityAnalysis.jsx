import { StoreIcon } from '../../icons'
import { BUSINESS_STATUS_OPTIONS } from '../../constants/businessSettings'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { getActivityAssessment } from '../../utils/statisticsCalculations'
import EmptyState from '../common/EmptyState'
import ActivityAnalysisItem from './ActivityAnalysisItem'

const STATUS_LABELS = Object.fromEntries(BUSINESS_STATUS_OPTIONS.map((status) => [status.value, status.label]))

function SummaryLine({ label, value }) {
  return (
    <div className="rounded-xl bg-surface px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="mt-0.5 font-extrabold text-ink">{value}</dd>
    </div>
  )
}

/**
 * Analyse des activités : nombre d'activités, la plus et la moins rentable, résultat de chacune.
 * Une activité en cours n'est jamais déclarée déficitaire : son résultat est « provisoire ».
 *
 * Props :
 * - performance : [{ businessId, name, status, invested, expenses, revenues, result }]
 * - summary : { total, ongoing, completed, best, worst }
 */
function ActivityAnalysis({ performance, summary }) {
  return (
    <section className={CARD_CLASSES} aria-label="Analyse des activités">
      <h2 className="text-lg font-bold text-ink">Analyse des activités</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Résultat = recettes − dépenses − investissements. Le résultat d'une activité en cours est provisoire.
      </p>

      {performance.length === 0 ? (
        <EmptyState icon={StoreIcon} title="Aucune activité" description="Aucune activité n'a de mouvement sur cette période." />
      ) : (
        <div className="mt-4 space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryLine label="Activités" value={summary.total} />
            <SummaryLine label="En cours" value={summary.ongoing} />
            <SummaryLine label="Terminées" value={summary.completed} />
            <SummaryLine label="Meilleur résultat" value={summary.best ? summary.best.name : '—'} />
            <SummaryLine label="Résultat le plus faible" value={summary.worst ? summary.worst.name : '—'} />
          </dl>

          <ul className="space-y-3">
            {performance.map((item) => {
              const assessment = getActivityAssessment(item)
              return (
                <ActivityAnalysisItem
                  key={item.businessId}
                  name={item.name}
                  statusLabel={STATUS_LABELS[item.status] ?? item.status}
                  invested={item.invested}
                  expenses={item.expenses}
                  revenues={item.revenues}
                  result={item.result}
                  assessmentLabel={assessment.label}
                  assessmentTone={assessment.tone}
                />
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

export default ActivityAnalysis
