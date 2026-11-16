import ContributionTableRow from './ContributionTableRow'

function ContributionTable({ contributions, onEdit, onDelete }) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-line md:block">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wide text-ink-soft">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Associé</th>
            <th scope="col" className="px-4 py-3 font-semibold">Montant</th>
            <th scope="col" className="px-4 py-3 font-semibold">Date</th>
            <th scope="col" className="px-4 py-3 font-semibold">Description</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {contributions.map((contribution) => (
            <ContributionTableRow
              key={contribution.id}
              associateName={contribution.associate.name}
              initials={contribution.associate.initials}
              avatarTone={contribution.associate.avatarTone}
              amount={contribution.amount}
              date={contribution.date}
              description={contribution.description}
              onEdit={() => onEdit(contribution)}
              onDelete={() => onDelete(contribution)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ContributionTable
