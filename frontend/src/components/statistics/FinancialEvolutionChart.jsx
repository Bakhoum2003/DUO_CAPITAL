import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EVOLUTION_SERIES } from '../../constants/statisticsSettings'
import { formatCompactAmount, formatCurrency } from '../../utils/formatters'
import ChartLegend from './ChartLegend'

const SERIES_LABELS = Object.fromEntries(EVOLUTION_SERIES.map((series) => [series.key, series.label]))

/**
 * Graphique A : évolution mensuelle des cotisations, investissements, dépenses et recettes.
 *
 * Props :
 * - data : [{ shortLabel, label, contributions, investments, expenses, revenues }] (un élément par mois)
 */
function FinancialEvolutionChart({ data }) {
  return (
    <>
      <div className="h-72 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e6ebe8" vertical={false} />
            <XAxis dataKey="shortLabel" tick={{ fill: '#111b2e', fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fill: '#111b2e', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCompactAmount}
              width={44}
            />
            <Tooltip
              formatter={(value, name) => [formatCurrency(value), SERIES_LABELS[name] ?? name]}
              labelFormatter={(label, items) => items?.[0]?.payload?.label ?? label}
              contentStyle={{ borderRadius: 12, border: '1px solid #d9e0dc', fontSize: 13 }}
            />
            {EVOLUTION_SERIES.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                stroke={series.color}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend items={EVOLUTION_SERIES} />
    </>
  )
}

export default FinancialEvolutionChart
