import { ChartLineIcon } from '../../icons'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { formatMonthKey, formatMoney } from '../../utils/treasuryViewModel'
import SectionHeader from '../common/SectionHeader'

const MAX_MONTHS = 12

/** Évolution mensuelle de la trésorerie (points fournis par l'API : entrées, sorties et solde cumulé). */
function TreasuryEvolution({ points }) {
  if (points.length === 0) return null
  const rows = points.slice(-MAX_MONTHS).reverse()
  return (
    <section className={CARD_CLASSES} aria-label="Évolution de la trésorerie">
      <SectionHeader icon={ChartLineIcon} title="Évolution mensuelle" badgeLabel={`${rows.length} dernier(s) mois`} />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-ink-soft">
            <tr>
              {['Mois', 'Entrées', 'Sorties', 'Solde en fin de mois'].map((label) => (
                <th key={label} scope="col" className={`px-3 py-2 font-semibold ${label === 'Mois' ? '' : 'text-right'}`}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((point) => (
              <tr key={point.key} className="border-t border-line">
                <th scope="row" className="whitespace-nowrap px-3 py-2.5 font-medium capitalize text-ink">{formatMonthKey(point.key)}</th>
                <td className="whitespace-nowrap px-3 py-2.5 text-right text-brand-700">{formatMoney(point.inflow)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right text-danger-600">{formatMoney(point.outflow)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold text-ink">{formatMoney(point.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default TreasuryEvolution
