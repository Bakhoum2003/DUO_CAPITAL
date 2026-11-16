import { createHash } from 'node:crypto'

export function hashWithdrawalRequest(body) {
  const canonical = JSON.stringify([body.beneficiaryId, body.amount, body.withdrawalDate, body.reason ?? null])
  return createHash('sha256').update(canonical).digest('hex')
}
