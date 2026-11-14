import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PERFORMANCE_SERIES } from '../../constants/statisticsSettings'
import { formatCompactAmount, formatCurrency } from '../../utils/formatters'
import ChartLegend from './ChartLegend'

const SERIES_LABELS = Object.fromEntries(PERFORMANCE_SERIES.map((series) => [series.key, series.label]))

/**
 * Graphique C : performance de chaque activité (investi, dépenses, recettes, résultat).
 *
 * Props :
 * - data : [{ name, invested, expenses, revenues, result }] (une activité par élément)
 */
function BusinessPerformanceChart({ data }) {
  return (
    <>
      <div className="h-80 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e6ebe8" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#111b2e', fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
            <YAxis
              tick={{ fill: '#111b2e', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCompactAmount}
              width={44}
            />
            <ReferenceLine y={0} stroke="#9aa7a0" />
            <Tooltip
              formatter={(value, name) => [formatCurrency(value), SERIES_LABELS[name] ?? name]}
              contentStyle={{ borderRadius: 12, border: '1px solid #d9e0dc', fontSize: 13 }}
            />
            {PERFORMANCE_SERIES.map((series) => (
              <Bar key={series.key} dataKey={series.key} fill={series.color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend items={PERFORMANCE_SERIES} />
    </>
  )
}

export default BusinessPerformanceChart
