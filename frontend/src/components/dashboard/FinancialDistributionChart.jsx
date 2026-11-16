import { ChartPieIcon } from '../../icons'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { formatCurrency, formatNumber } from '../../utils/formatters'
import SectionHeader from '../common/SectionHeader'

const SEGMENT_COLORS = {
  green: '#0c8236',
  red: '#e5242b',
}

function FinancialDistributionChart({ segments }) {
  const total = segments.reduce((sum, segment) => sum + segment.amount, 0)

  return (
    <section className={CARD_CLASSES} aria-label="Répartition des revenus">
      <SectionHeader
        icon={ChartPieIcon}
        iconClassName="text-danger-500"
        title="Répartition de vos revenus"
      />

      <div className="flex flex-col items-center gap-6 sm:flex-row xl:flex-col min-[1400px]:flex-row">
        <div className="relative h-48 w-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={segments}
                dataKey="amount"
                nameKey="label"
                innerRadius="64%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                stroke="#ffffff"
                strokeWidth={2}
              >
                {segments.map((segment) => (
                  <Cell key={segment.id} fill={SEGMENT_COLORS[segment.color]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-extrabold leading-tight text-ink">{formatNumber(total)}</span>
            <span className="text-lg font-bold leading-tight text-ink">FCFA</span>
          </div>
        </div>

        <ul className="w-full min-w-0 flex-1 space-y-4">
          {segments.map((segment) => (
            <li key={segment.id} className="flex items-start gap-3">
              <span
                className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: SEGMENT_COLORS[segment.color] }}
                aria-hidden="true"
              />
              <div>
                <p className="text-base text-ink">
                  {segment.label} ({Math.round((segment.amount / total) * 100)}%)
                </p>
                <p className="text-base font-bold text-ink">{formatCurrency(segment.amount)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default FinancialDistributionChart
