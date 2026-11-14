import { createHash } from 'node:crypto'

/** Empreinte stable du contenu métier d'une demande (détecte une clé d'envoi réutilisée pour une autre cotisation). */
export function hashCreateRequest(body) {
  const canonical = JSON.stringify([body.partnerId, body.amount, body.contributionDate, body.period, body.note ?? null])
  return createHash('sha256').update(canonical).digest('hex')
}
