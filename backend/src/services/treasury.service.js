import { Business } from '../models/Business.js'
import { BusinessOperation } from '../models/BusinessOperation.js'
import { Contribution } from '../models/Contribution.js'
import { User } from '../models/User.js'
import { Withdrawal } from '../models/Withdrawal.js'
import { AppError } from '../utils/AppError.js'
import { todayInBusinessZone } from '../utils/businessDates.js'
import { isObjectId } from '../validation/activity.schemas.js'
import { buildComponents, buildDirectories, computeTreasury, findMovementDetail, listMovements } from './treasury/ledger.js'
import { createOutflowGuard } from './treasury/outflowGuard.js'

const ACTIVE = { deletedAt: null }

/**
 * Trésorerie commune des deux associés (consultation : aucune écriture). Calculs faits ici, côté serveur, à partir des
 * enregistrements non supprimés ; le frontend n'additionne jamais rien.
 * `guard` : garde atomique des sorties d'argent, à utiliser par tout futur service de retrait / investissement / dépense.
 * @param {{ clock?: () => Date }} options
 */
export function createTreasuryService({ clock = () => new Date() } = {}) {
  /** Enregistrements financiers non supprimés (+ noms des associés et des activités). `dbSession` : lecture dans une transaction. */
  async function loadSources(dbSession) {
    const options = dbSession ? { session: dbSession } : {}
    const [users, businesses, contributions, operations, withdrawals] = await Promise.all([
      User.find({}, { name: 1, partnerNumber: 1 }, options).sort({ partnerNumber: 1 }).lean(),
      Business.find({}, { name: 1, category: 1, status: 1 }, options).lean(),
      Contribution.find(ACTIVE, null, options).lean(),
      BusinessOperation.find(ACTIVE, null, options).lean(),
      Withdrawal.find(ACTIVE, null, options).lean(),
    ])
    return { users, businesses, contributions, operations, withdrawals }
  }

  const guard = createOutflowGuard({ loadSources, computeBalance: (sources, today) => computeTreasury(sources, today).balance, clock })

  return {
    guard,

    /** Lecture cohérente des enregistrements actifs + date du jour : base des modules de CONSULTATION (Historique), sans aucun recalcul ici. */
    async readSnapshot() {
      const now = clock()
      return { sources: await loadSources(), today: todayInBusinessZone(now), now }
    },

    /** Solde disponible aujourd'hui (même calcul que la synthèse) : utilisé par le module Retraits pour l'indication de solde. */
    async getBalance() {
      const now = clock()
      const today = todayInBusinessZone(now)
      return { balance: computeTreasury(await loadSources(), today).balance, asOf: today, generatedAt: now.toISOString() }
    },

    async getSummary() {
      const now = clock()
      const today = todayInBusinessZone(now)
      const sources = await loadSources()
      const totals = computeTreasury(sources, today)
      const notices = [{ code: 'NO_INITIAL_BALANCE', level: 'info', message: "Le solde est calculé uniquement à partir des mouvements enregistrés : aucun solde d'ouverture n'est défini." }]
      if (totals.futureIgnored.count > 0) {
        notices.push({ code: 'FUTURE_MOVEMENTS_IGNORED', level: 'info', message: `${totals.futureIgnored.count} mouvement(s) daté(s) dans le futur ne sont pas encore comptés dans le solde.` })
      }
      return {
        ...totals,
        components: buildComponents(totals),
        partners: sources.users.map((user) => ({ id: String(user._id), name: user.name, partnerNumber: user.partnerNumber })), // pour le filtre par associé
        notices,
        asOf: today,
        generatedAt: now.toISOString(),
        currency: 'XOF',
        timeZone: 'Africa/Dakar',
      }
    },

    /** @param {object} query filtres déjà validés */
    async listMovements(query) {
      const today = todayInBusinessZone(clock())
      const sources = await loadSources()
      return listMovements(sources, buildDirectories(sources), query, today)
    },

    async getMovement(type, id) {
      if (!isObjectId(id)) throw new AppError({ status: 400, code: 'INVALID_ID', message: "L'identifiant du mouvement est invalide." })
      const today = todayInBusinessZone(clock())
      const sources = await loadSources()
      const detail = findMovementDetail(sources, buildDirectories(sources), type, id, today)
      if (!detail) throw new AppError({ status: 404, code: 'MOVEMENT_NOT_FOUND', message: "Ce mouvement n'existe pas ou a été supprimé." })
      return detail
    },
  }
}
