
export const REMINDER_STATUSES = Object.freeze({ ACHIEVED: 'ACHIEVED', TO_COMPLETE: 'TO_COMPLETE' })

const progressPercent = (paid, target) => (target > 0 ? Math.min(100, Math.round((paid / target) * 1000) / 10) : 0)

/**
 * @param {ReturnType<typeof import('../contributions/summary.js').computeContributionSummary>} summary
 * @returns {{ available: boolean, unavailableReason: string | null, currentPeriod: string, fundStartPeriod: string | null, monthlyTargetPerPartner: number, monthlyTargetCollective: number, pendingCount: number, months: object[] }}
 */
export function buildContributionReminders(summary) {
  const target = summary.monthlyTargetPerPartner
  const identities = new Map(summary.partners.map((partner) => [partner.partnerId, partner]))
  // Mois courant (toujours affiché, atteint ou non) + mois PASSÉS réellement impayés ou incomplets. Jamais de mois futur.
  const selected = summary.months.filter((month) => month.isCurrent || month.isOverdue)
  selected.sort((a, b) => (a.isCurrent === b.isCurrent ? (a.period < b.period ? 1 : -1) : a.isCurrent ? -1 : 1)) // courant d'abord, puis du plus récent au plus ancien

  const months = selected.map((month) => ({
    period: month.period,
    isCurrent: month.isCurrent,
    isOverdue: month.isOverdue,
    target: month.target,
    paid: month.paid, // réel, non plafonné
    remaining: month.remaining,
    progressPercent: progressPercent(month.paid, month.target),
    partners: month.partners.map((row) => {
      const identity = identities.get(row.partnerId)
      return {
        partnerId: row.partnerId,
        name: identity?.name ?? null,
        partnerNumber: identity?.partnerNumber ?? null,
        period: month.period,
        monthlyTarget: target,
        paid: row.paid, // réel, non plafonné (20 000 versés = 20 000)
        remaining: Math.max(0, target - row.paid),
        progressPercent: progressPercent(row.paid, target),
        status: row.paid >= target ? REMINDER_STATUSES.ACHIEVED : REMINDER_STATUSES.TO_COMPLETE,
      }
    }),
  }))

  return {
    available: summary.expectedAvailable && summary.fundStarted,
    unavailableReason: summary.unavailableReason ?? (summary.fundStarted ? null : "Le fonds n'a pas encore démarré : aucun rappel de cotisation."),
    currentPeriod: summary.currentPeriod,
    fundStartPeriod: summary.fundStartPeriod,
    monthlyTargetPerPartner: target,
    monthlyTargetCollective: summary.monthlyTargetCollective,
    pendingCount: months.reduce((total, month) => total + month.partners.filter((row) => row.status === REMINDER_STATUSES.TO_COMPLETE).length, 0),
    months,
  }
}
