import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_COLORS } from '../../constants/statisticsSettings'
import { formatCompactAmount, formatCurrency } from '../../utils/formatters'
import ChartLegend from './ChartLegend'

function AssociateContributionChart({ data, associates, monthlyTarget }) {
  const names = Object.fromEntries(associates.map((associate) => [associate.id, associate.name]))
  const legendItems = associates.map((associate, index) => ({ label: associate.name, color: CHART_COLORS.associates[index] }))

  return (
    <>
      <div className="h-64 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e6ebe8" vertical={false} />
            <XAxis dataKey="shortLabel" tick={{ fill: '#111b2e', fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fill: '#111b2e', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCompactAmount}
              width={44}
            />
            <ReferenceLine y={monthlyTarget} stroke="#64748b" strokeDasharray="4 4" />
            <Tooltip
              formatter={(value, name) => [formatCurrency(value), names[name] ?? name]}
              labelFormatter={(label, items) => items?.[0]?.payload?.label ?? label}
              contentStyle={{ borderRadius: 12, border: '1px solid #d9e0dc', fontSize: 13 }}
            />
            {associates.map((associate, index) => (
              <Bar
                key={associate.id}
                dataKey={associate.id}
                fill={CHART_COLORS.associates[index]}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend items={legendItems} />
      <p className="mt-1 text-xs text-ink-soft">Ligne pointillée : objectif mensuel de {formatCurrency(monthlyTarget)} par associé.</p>
    </>
  )
}

export default AssociateContributionChart
