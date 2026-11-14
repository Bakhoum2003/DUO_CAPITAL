import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CHART_COLORS } from '../../constants/statisticsSettings'
import { formatCurrency } from '../../utils/formatters'

function getColor(index) {
  return CHART_COLORS.expenseCategories[index % CHART_COLORS.expenseCategories.length]
}

/**
 * Graphique B : répartition des dépenses par catégorie, avec le détail chiffré à côté.
 *
 * Props :
 * - data : [{ label, amount, percent }] (de la catégorie la plus élevée à la plus faible)
 */
function ExpenseBreakdownChart({ data }) {
  return (
    <div className="grid items-center gap-4 md:max-xl:grid-cols-2 2xl:grid-cols-2">
      <div className="h-56 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="label"
              innerRadius="55%"
              outerRadius="100%"
              stroke="#ffffff"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((item, index) => (
                <Cell key={item.label} fill={getColor(index)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatCurrency(value), name]}
              contentStyle={{ borderRadius: 12, border: '1px solid #d9e0dc', fontSize: 13 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-2 text-sm">
        {data.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: getColor(index) }} aria-hidden="true" />
            <span className="min-w-0 flex-1 text-ink">{item.label}</span>
            <span className="shrink-0 font-semibold text-ink">{formatCurrency(item.amount)}</span>
            <span className="w-10 shrink-0 text-right text-ink-soft">{item.percent} %</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ExpenseBreakdownChart
