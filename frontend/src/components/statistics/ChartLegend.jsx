/**
 * Légende d'un graphique : pastille de couleur + nom (la couleur ne porte jamais seule l'information).
 *
 * Props :
 * - items : [{ label, color }]
 */
function ChartLegend({ items }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-soft">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

export default ChartLegend
