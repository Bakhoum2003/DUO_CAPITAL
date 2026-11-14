import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { hasAmounts } from '../../utils/dashboardViewModel'
import { formatCompactAmount, formatCurrency } from '../../utils/formatters'
import SectionHeader from '../common/SectionHeader'

/**
 * Répartition en barres horizontales (investissements par activité, dépenses par catégorie, cotisations par associé).
 * Props : title, icon, rows [{ label, amount }], color, emptyMessage.
 */
function BreakdownChart({ title, icon, rows, color, emptyMessage }) {
  const height = Math.max(160, rows.length * 44 + 40)
  return (
    <section className={CARD_CLASSES} aria-label={title}>
      <SectionHeader icon={icon} title={title} />
      {!hasAmounts(rows) ? (
        <p className="py-10 text-center text-sm text-ink-soft">{emptyMessage}</p>
      ) : (
        <div className="w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={formatCompactAmount} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [formatCurrency(value), 'Montant']} />
              <Bar dataKey="amount" fill={color} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export default BreakdownChart
