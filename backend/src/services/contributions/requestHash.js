import { createHash } from 'node:crypto'

export function hashCreateRequest(body) {
  const canonical = JSON.stringify([body.partnerId, body.amount, body.contributionDate, body.period, body.note ?? null])
  return createHash('sha256').update(canonical).digest('hex')
}
