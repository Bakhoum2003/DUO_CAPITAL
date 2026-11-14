import HistoryTableRow from './HistoryTableRow'

/**
 * Tableau de l'historique (à partir des écrans moyens ; sur mobile on utilise HistoryMobileItem).
 *
 * Props :
 * - entries : mouvements { id, type, direction, amount, date, description, businessName, associateName }
 * - onShowDetails : fonction appelée avec le mouvement dont on veut le détail
 */
function HistoryTable({ entries, onShowDetails }) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-line md:block">
      <table className="w-full min-w-[52rem] text-left text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wide text-ink-soft">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Date</th>
            <th scope="col" className="px-4 py-3 font-semibold">Type</th>
            <th scope="col" className="px-4 py-3 font-semibold">Description</th>
            <th scope="col" className="px-4 py-3 font-semibold">Associé</th>
            <th scope="col" className="px-4 py-3 font-semibold">Montant</th>
            <th scope="col" className="px-4 py-3 font-semibold">Sens</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Détail</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <HistoryTableRow
              key={entry.id}
              type={entry.type}
              direction={entry.direction}
              amount={entry.amount}
              date={entry.date}
              description={entry.description}
              businessName={entry.businessName}
              associateName={entry.associateName}
              onShowDetails={() => onShowDetails(entry)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default HistoryTable
