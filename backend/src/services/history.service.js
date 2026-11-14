// Historique centralisé des opérations financières : CONSULTATION SEULE, aucune écriture, aucun nouveau modèle.
//
// Aucun calcul financier n'est dupliqué : les mouvements, totaux, filtres, tris et détails viennent du registre de la
// trésorerie (Phase F, qui réutilise le calculateur du Dashboard) et le résultat commercial du Dashboard.
// - seules les opérations déjà survenues (date <= aujourd'hui, Africa/Dakar) sont listées et comptées ;
// - les enregistrements supprimés logiquement ne sont jamais chargés ;
// - une opération = un enregistrement d'origine = une ligne ; un bénéfice calculé n'est JAMAIS une opération ni une entrée.

import { buildDirectories, computeTreasury, listMovements } from './treasury/ledger.js'
import { toOperationDetail, toOperationView } from './history/historyView.js'
import { toLedgerQuery } from './history/query.js'

/**
 * @param {object} deps
 * @param {ReturnType<import('./treasury.service.js').createTreasuryService>} deps.treasuryService
 * @param {ReturnType<import('./dashboard.service.js').createDashboardService>} deps.dashboardService
 */
export function createHistoryService({ treasuryService, dashboardService }) {
  return {
    /** Indicateurs globaux (depuis le début, jusqu'à aujourd'hui). */
    async summary() {
      const { sources, today, now } = await treasuryService.readSnapshot()
      const totals = computeTreasury(sources, today)
      const dashboard = await dashboardService.getDashboard({ period: 'all' })
      const directories = buildDirectories(sources)
      const notices = [
        { code: 'RESULT_IS_NOT_CASH', level: 'info', message: "Le résultat commercial est un calcul (recettes − dépenses) : ce n'est pas une opération et il n'est jamais ajouté aux entrées." },
      ]
      if (totals.futureIgnored.count > 0) {
        notices.push({ code: 'FUTURE_OPERATIONS_IGNORED', level: 'info', message: `${totals.futureIgnored.count} opération(s) datée(s) dans le futur ne sont ni listées ni comptées dans les totaux.` })
      }
      return {
        totals: {
          contributions: totals.contributions,
          revenues: totals.revenues,
          investments: totals.investments,
          expenses: totals.expenses,
          withdrawals: totals.withdrawals,
          inflow: totals.inflow,
          outflow: totals.outflow,
          net: totals.balance,
          operationsCount: totals.movementsCount,
        },
        commercialResult: dashboard.result,
        lastOperationDate: totals.lastMovementDate,
        futureIgnored: totals.futureIgnored,
        partners: sources.users.map((user) => ({ id: String(user._id), name: user.name, partnerNumber: user.partnerNumber })),
        activities: [...directories.businesses.values()].map(({ id, name, status }) => ({ id, name, status })).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
        notices,
        asOf: today,
        generatedAt: now.toISOString(),
        currency: 'XOF',
        timeZone: 'Africa/Dakar',
      }
    },

    /** Liste unifiée : filtres, recherche, tri et pagination côté serveur (paramètres déjà validés). */
    async list(query) {
      const { sources, today } = await treasuryService.readSnapshot()
      const { movements, meta } = listMovements(sources, buildDirectories(sources), toLedgerQuery(query, today), today)
      return {
        operations: movements.map(toOperationView),
        meta: { page: meta.page, limit: meta.pageSize, total: meta.total, totalPages: meta.totalPages, filtered: meta.filtered },
      }
    },

    /** Détail d'une opération (même future : elle est alors signalée comme non comptabilisée). */
    async detail(type, id) {
      return toOperationDetail(await treasuryService.getMovement(type, id))
    },
  }
}
