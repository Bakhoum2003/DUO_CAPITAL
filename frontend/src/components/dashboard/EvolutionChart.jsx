import { ArrowTrendUpIcon } from '../../icons'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CARD_CLASSES } from '../../constants/uiClasses'
import { formatAxisKey, hasPoints } from '../../utils/dashboardViewModel'
import { formatCompactAmount, formatCurrency } from '../../utils/formatters'
import SectionHeader from '../common/SectionHeader'

const NAMES = { inflow: 'Entrées', outflow: 'Sorties', balance: 'Trésorerie', capital: 'Capital' }

/** Évolution financière : entrées/sorties de chaque période et trésorerie / capital cumulés. */
function EvolutionChart({ evolution, periodLabel }) {
  const points = evolution?.points ?? []
  const rows = points.map((point) => ({ ...point, label: formatAxisKey(point.key, evolution.granularity) }))
  return (
    <section className={CARD_CLASSES} aria-label="Évolution financière">
      <SectionHeader icon={ArrowTrendUpIcon} title="Évolution financière" badgeLabel={periodLabel} />
      {!hasPoints(points) ? (
        <p className="py-10 text-center text-sm text-ink-soft">Aucun mouvement enregistré sur cette période.</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatCompactAmount} tick={{ fontSize: 12 }} width={48} />
              <Tooltip formatter={(value, name) => [formatCurrency(value), NAMES[name] ?? name]} />
              <Legend formatter={(name) => NAMES[name] ?? name} />
              <Bar dataKey="inflow" fill="#0c8236" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outflow" fill="#e11d2a" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="capital" stroke="#7c3aed" strokeWidth={2} dot={false} strokeDasharray="5 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export default EvolutionChart
