import { CalendarDaysIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { MONTH_STATE_LABELS } from '../../utils/contributionsViewModel'
import { formatCurrency } from '../../utils/formatters'
import SectionHeader from '../common/SectionHeader'

const STATE_CLASSES = { COMPLETE: 'bg-brand-50 text-brand-700', OVERDUE: 'bg-danger-50 text-danger-600', IN_PROGRESS: 'bg-amber-50 text-amber-700' }

/** Suivi mois par mois : identifie les mois réglés, en cours et non réglés. Props : rows (voir buildMonthRows), partners [{ partnerId, name }]. */
function MonthlyTrackingTable({ rows, partners }) {
  return (
    <section className={CARD_CLASSES} aria-label="Suivi mensuel">
      <SectionHeader icon={CalendarDaysIcon} title="Suivi mensuel" />
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-soft">Aucun mois à suivre : le fonds n'a pas encore démarré.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-ink-soft">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Mois</th>
                {partners.map((partner) => <th key={partner.partnerId} scope="col" className="px-3 py-2 font-semibold">{partner.name}</th>)}
                <th scope="col" className="px-3 py-2 font-semibold">Total / objectif</th>
                <th scope="col" className="px-3 py-2 font-semibold">État</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.period} className="border-t border-line">
                  <th scope="row" className="whitespace-nowrap px-3 py-3 font-semibold text-ink">{row.label}</th>
                  {partners.map((partner) => {
                    const cell = row.partners.find((item) => item.partnerId === partner.partnerId)
                    return (
                      <td key={partner.partnerId} className="whitespace-nowrap px-3 py-3 text-ink">
                        {formatCurrency(cell?.paid ?? 0)} <span className="text-ink-soft">· {cell?.statusLabel}</span>
                      </td>
                    )
                  })}
                  <td className="whitespace-nowrap px-3 py-3 text-ink">{formatCurrency(row.paid)} / {formatCurrency(row.target)}</td>
                  <td className="px-3 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATE_CLASSES[row.state]}`}>{MONTH_STATE_LABELS[row.state]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default MonthlyTrackingTable
