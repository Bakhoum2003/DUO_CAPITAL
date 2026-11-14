// Représentation publique d'une cotisation : jamais d'email, d'empreinte ni de donnée de session.
const idOf = (value) => (value == null ? null : String(value._id ?? value))

/** @param {object} contribution document (lean ou Mongoose) @param {Map<string, {name:string, partnerNumber:number}>} users */
export function toContributionView(contribution, users) {
  const partner = users.get(idOf(contribution.partner))
  const author = users.get(idOf(contribution.recordedBy))
  return {
    id: String(contribution._id),
    partner: { id: idOf(contribution.partner), name: partner?.name ?? null, partnerNumber: partner?.partnerNumber ?? null },
    amount: contribution.amount,
    contributionDate: contribution.contributionDate,
    period: contribution.period,
    note: contribution.note ?? null,
    recordedBy: { id: idOf(contribution.recordedBy), name: author?.name ?? null },
    createdAt: contribution.createdAt instanceof Date ? contribution.createdAt.toISOString() : (contribution.createdAt ?? null),
  }
}
