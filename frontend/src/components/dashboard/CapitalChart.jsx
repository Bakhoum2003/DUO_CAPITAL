import { ArrowTrendUpIcon } from '../../icons'
import {
  Area,
  AreaChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { formatCompactAmount, formatCurrency } from '../../utils/formatters'
import SectionHeader from '../common/SectionHeader'

const LINE_COLOR = '#0c8236'
const Y_AXIS_TICKS = [0, 100000, 200000, 300000, 400000]

// Étiquette au-dessus d'un point ; le dernier point reçoit une pastille verte.
function CapitalPointLabel({ x, y, value, isLast }) {
  const pointX = Number(x)
  const pointY = Number(y)
  const text = formatCompactAmount(value)

  if (isLast) {
    return (
      <g>
        <rect x={pointX - 24} y={pointY - 36} width={48} height={22} rx={6} fill={LINE_COLOR} />
        <text x={pointX} y={pointY - 21} textAnchor="middle" fill="#ffffff" fontSize={12} fontWeight={600}>
          {text}
        </text>
      </g>
    )
  }

  return (
    <text x={pointX} y={pointY - 12} textAnchor="middle" fill="#111b2e" fontSize={12}>
      {text}
    </text>
  )
}

/**
 * Graphique « Évolution de votre capital » (courbe avec aire, Recharts, responsive).
 *
 * Props :
 * - history : tableau { month, capital } (capital en FCFA)
 * - periodLabel : période affichée dans la pastille (ex. « 6 derniers mois »)
 */
function CapitalChart({ history, periodLabel }) {
  const lastIndex = history.length - 1

  return (
    <section className={CARD_CLASSES} aria-label="Évolution du capital">
      <SectionHeader
        icon={ArrowTrendUpIcon}
        iconClassName="text-brand-600"
        title="Évolution de votre capital"
        badgeLabel={periodLabel}
      />

      <div className="h-64 w-full min-w-0 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 40, right: 24, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="capitalAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.28} />
                <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0.03} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#e6ebe8" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#111b2e', fontSize: 12 }}
            />
            <YAxis
              ticks={Y_AXIS_TICKS}
              domain={[0, 450000]}
              width={44}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCompactAmount}
              tick={{ fill: '#111b2e', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ stroke: LINE_COLOR, strokeDasharray: '4 4' }}
              formatter={(value) => [formatCurrency(value), 'Capital']}
              contentStyle={{ borderRadius: 12, border: '1px solid #d9e0dc', fontSize: 13 }}
            />
            <Area
              type="monotone"
              dataKey="capital"
              stroke={LINE_COLOR}
              strokeWidth={2.5}
              fill="url(#capitalAreaGradient)"
              dot={{ r: 4, fill: LINE_COLOR, stroke: '#ffffff', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: LINE_COLOR, stroke: '#ffffff', strokeWidth: 2 }}
            >
              <LabelList
                dataKey="capital"
                content={(labelProps) => (
                  <CapitalPointLabel
                    x={labelProps.x}
                    y={labelProps.y}
                    value={labelProps.value}
                    isLast={labelProps.index === lastIndex}
                  />
                )}
              />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export default CapitalChart
