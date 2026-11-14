import { createHash } from 'node:crypto'

/** Empreinte stable du contenu métier d'une demande de retrait (détecte une clé d'envoi réutilisée pour un autre retrait). */
export function hashWithdrawalRequest(body) {
  const canonical = JSON.stringify([body.beneficiaryId, body.amount, body.withdrawalDate, body.reason ?? null])
  return createHash('sha256').update(canonical).digest('hex')
}
