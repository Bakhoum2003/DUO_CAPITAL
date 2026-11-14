// Représentation publique d'un retrait : jamais d'email, d'empreinte ni de donnée de session.
const idOf = (value) => (value == null ? null : String(value._id ?? value))
const iso = (value) => (value instanceof Date ? value.toISOString() : (value ?? null))

const personOf = (users, id) => {
  const user = users.get(id)
  return { id, name: user?.name ?? null, partnerNumber: user?.partnerNumber ?? null }
}

/** @param {object} withdrawal document (lean ou Mongoose) @param {Map<string, {name:string, partnerNumber:number}>} users */
export function toWithdrawalView(withdrawal, users) {
  const author = users.get(idOf(withdrawal.recordedBy))
  return {
    id: String(withdrawal._id),
    beneficiary: personOf(users, idOf(withdrawal.beneficiary)),
    amount: withdrawal.amount,
    withdrawalDate: withdrawal.withdrawalDate,
    reason: withdrawal.reason ?? null,
    recordedBy: { id: idOf(withdrawal.recordedBy), name: author?.name ?? null, partnerNumber: author?.partnerNumber ?? null },
    createdAt: iso(withdrawal.createdAt),
    updatedAt: iso(withdrawal.updatedAt),
  }
}

/** Instantané des champs métier d'un retrait pour l'AuditLog (identifiants, montant, date, motif : aucun secret). */
export function toAuditSnapshot(withdrawal) {
  return {
    beneficiary: idOf(withdrawal.beneficiary),
    recordedBy: idOf(withdrawal.recordedBy),
    amount: withdrawal.amount,
    withdrawalDate: withdrawal.withdrawalDate,
    reason: withdrawal.reason ?? null,
  }
}
