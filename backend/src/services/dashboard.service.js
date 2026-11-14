import { MONTHLY_CONTRIBUTION_PER_PARTNER } from '../config/constants.js'
import { Business } from '../models/Business.js'
import { BusinessOperation } from '../models/BusinessOperation.js'
import { Contribution } from '../models/Contribution.js'
import { User } from '../models/User.js'
import { Withdrawal } from '../models/Withdrawal.js'
import { resolvePeriodRange, todayInBusinessZone } from '../utils/businessDates.js'
import { computeDashboard } from './dashboard/calculator.js'

/**
 * Dashboard financier commun aux deux associés (lecture seule : aucune écriture en base).
 * Les calculs sont faits ici, côté serveur, à partir des seuls enregistrements non supprimés ;
 * le frontend ne reconstruit jamais un total.
 *
 * @param {object} options
 * @param {{ fund: { startPeriod: string | null } }} options.config
 * @param {() => Date} [options.clock]
 */
export function createDashboardService({ config, clock = () => new Date() }) {
  return {
    /** @param {{ period: string, from?: string, to?: string }} query filtre déjà validé */
    async getDashboard(query) {
      const now = clock()
      const today = todayInBusinessZone(now)
      const range = resolvePeriodRange(query, today)

      const active = { deletedAt: null }
      const [users, businesses, contributions, operations, withdrawals] = await Promise.all([
        User.find({}, { name: 1, partnerNumber: 1 }).sort({ partnerNumber: 1 }).lean(),
        Business.find({}, { name: 1, category: 1, status: 1 }).lean(),
        Contribution.find(active, { partner: 1, amount: 1, contributionDate: 1, period: 1, note: 1, createdAt: 1 }).lean(),
        BusinessOperation.find(active, { business: 1, type: 1, amount: 1, operationDate: 1, description: 1, concernedPartner: 1, createdAt: 1 }).lean(),
        Withdrawal.find(active, { beneficiary: 1, amount: 1, withdrawalDate: 1, reason: 1, createdAt: 1 }).lean(),
      ])

      const dashboard = computeDashboard({
        today,
        range,
        fundStartPeriod: config.fund.startPeriod,
        monthlyTarget: MONTHLY_CONTRIBUTION_PER_PARTNER,
        partners: users.map((user) => ({ id: String(user._id), name: user.name, partnerNumber: user.partnerNumber })),
        businesses,
        contributions,
        operations,
        withdrawals,
      })

      return { ...dashboard, generatedAt: now.toISOString(), currency: 'XOF', timeZone: 'Africa/Dakar', fundStartPeriod: config.fund.startPeriod }
    },
  }
}
