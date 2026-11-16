import OperationTableRow from './OperationTableRow'

function OperationTable({ operations, onEdit, onDelete }) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-line md:block">
      <table className="w-full min-w-[46rem] text-left text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wide text-ink-soft">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Date</th>
            <th scope="col" className="px-4 py-3 font-semibold">Type</th>
            <th scope="col" className="px-4 py-3 font-semibold">Montant</th>
            <th scope="col" className="px-4 py-3 font-semibold">Associé</th>
            <th scope="col" className="px-4 py-3 font-semibold">Détails</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {operations.map((operation) => (
            <OperationTableRow
              key={operation.id}
              type={operation.type}
              amount={operation.amount}
              date={operation.date}
              associateName={operation.associate.name}
              initials={operation.associate.initials}
              avatarTone={operation.associate.avatarTone}
              categoryLabel={operation.categoryLabel}
              description={operation.description}
              onEdit={() => onEdit(operation)}
              onDelete={() => onDelete(operation)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default OperationTable
