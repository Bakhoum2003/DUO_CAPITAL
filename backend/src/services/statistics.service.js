// purs (services/statistics/calculator.js) bâtis sur le calculateur du Dashboard. Le frontend n'additionne jamais rien.

import { MONTHLY_CONTRIBUTION_PER_PARTNER } from '../config/constants.js'
import { computeStatistics } from './statistics/calculator.js'
import { previousPeriodRange, resolveStatisticsRange } from './statistics/periods.js'

/**
 * @param {object} deps
 * @param {ReturnType<import('./treasury.service.js').createTreasuryService>} deps.treasuryService
 * @param {{ fund: { startPeriod: string | null } }} deps.config
 */
export function createStatisticsService({ treasuryService, config }) {
  return {
    /** @param {{ period: string, from?: string, to?: string }} query paramètres déjà validés */
    async getStatistics(query) {
      const { sources, today, now } = await treasuryService.readSnapshot()
      const range = resolveStatisticsRange(query, today)
      const statistics = computeStatistics({
        today,
        range,
        previousRange: previousPeriodRange(range),
        fundStartPeriod: config.fund.startPeriod,
        monthlyTarget: MONTHLY_CONTRIBUTION_PER_PARTNER,
        partners: sources.users.map((user) => ({ id: String(user._id), name: user.name, partnerNumber: user.partnerNumber })),
        businesses: sources.businesses,
        contributions: sources.contributions,
        operations: sources.operations,
        withdrawals: sources.withdrawals,
      })
      return { ...statistics, asOf: today, generatedAt: now.toISOString(), currency: 'XOF', timeZone: 'Africa/Dakar' }
    },
  }
}
