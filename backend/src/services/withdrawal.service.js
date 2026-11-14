// Retraits des deux associés (mêmes droits pour les deux).
//
// Principes :
// - un retrait est une SORTIE d'argent : création, modification et suppression passent par la garde atomique de la
//   Phase F (verrou TreasuryLock + solde relu dans la transaction) ; solde insuffisant => 409 INSUFFICIENT_TREASURY,
//   rien n'est écrit (ni retrait, ni audit, ni clé d'idempotence) ;
// - l'auteur (`recordedBy`) vient de la session et n'est jamais modifiable ; le bénéficiaire est choisi explicitement
//   (existant ET actif) : il n'est jamais déduit de l'auteur ;
// - création idempotente : clé réservée, retrait, audit et réponse enregistrés dans la MÊME transaction ;
// - suppression logique seulement (jamais physique) ; un retrait supprimé n'est plus compté dans la trésorerie ;
// - les montants de trésorerie ne sont pas recalculés ici : le solde est celui de la trésorerie (Phase F).

import { IDEMPOTENCY_KEY_TTL_MS } from '../models/shared/constants.js'
import { IdempotencyKey } from '../models/IdempotencyKey.js'
import { User } from '../models/User.js'
import { Withdrawal } from '../models/Withdrawal.js'
import { AppError } from '../utils/AppError.js'
import { recordAudit } from './audit.service.js'
import { hashWithdrawalRequest } from './withdrawals/requestHash.js'
import { listWithdrawals, summarizeWithdrawals } from './withdrawals/query.js'
import { toAuditSnapshot, toWithdrawalView } from './withdrawals/view.js'

export const CREATE_ENDPOINT = 'POST /api/v1/withdrawals'
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/
const businessError = (status, code, message, fields) => new AppError({ status, code, message, fields })
const fieldError = (status, code, field, message) => businessError(status, code, message, [{ field, message }])

/**
 * @param {object} options
 * @param {ReturnType<import('./treasury.service.js').createTreasuryService>} options.treasuryService garde atomique et solde (Phase F)
 * @param {() => Date} [options.clock] horloge MÉTIER (date du jour à Dakar) ; injectable dans les tests
 * @param {() => Date} [options.systemClock] heure SYSTÈME (horodatages techniques : expiration des clés d'idempotence)
 */
export function createWithdrawalService({ treasuryService, clock = () => new Date(), systemClock = () => new Date() }) {
  const { guard } = treasuryService
  const directory = async (dbSession) => {
    const users = await User.find({}, { name: 1, partnerNumber: 1 }, dbSession ? { session: dbSession } : {}).sort({ partnerNumber: 1 }).lean()
    return { users, byId: new Map(users.map((user) => [String(user._id), user])) }
  }

  async function assertActiveBeneficiary(beneficiaryId, dbSession) {
    const partner = OBJECT_ID_PATTERN.test(beneficiaryId) ? await User.findById(beneficiaryId, { name: 1, partnerNumber: 1, status: 1 }, dbSession ? { session: dbSession } : {}).lean() : null
    if (!partner) throw fieldError(404, 'PARTNER_NOT_FOUND', 'beneficiaryId', 'Associé bénéficiaire introuvable.')
    if (partner.status !== 'ACTIVE') throw fieldError(409, 'PARTNER_DISABLED', 'beneficiaryId', "Ce compte d'associé est désactivé : aucun retrait ne peut être enregistré à son bénéfice.")
    return partner
  }

  function replayOf(record, requestHash) {
    if (record.requestHash !== requestHash) throw businessError(422, 'IDEMPOTENCY_KEY_REUSED', "Cette clé d'envoi a déjà servi pour un autre retrait.")
    if (record.status === 'COMPLETED') return { replayed: true, statusCode: record.response.statusCode, body: record.response.body }
    throw businessError(409, 'REQUEST_IN_PROGRESS', 'Cet enregistrement est déjà en cours de traitement. Patientez un instant.')
  }

  async function findActive(id, dbSession) {
    const found = OBJECT_ID_PATTERN.test(id) ? await Withdrawal.findOne({ _id: id, deletedAt: null }, null, dbSession ? { session: dbSession } : {}) : null
    if (!found) throw businessError(404, 'WITHDRAWAL_NOT_FOUND', 'Retrait introuvable ou déjà supprimé.')
    return found
  }

  const activeWithdrawals = () => Withdrawal.find({ deletedAt: null }).lean()

  return {
    /**
     * Enregistre UN retrait. Retourne { statusCode, body, replayed }.
     * @param {{ actor: { userId: string, name: string }, body: object, idempotencyKey: string, meta?: object }} input
     */
    async create({ actor, body, idempotencyKey, meta = {} }) {
      const systemNow = systemClock()
      const beneficiary = await assertActiveBeneficiary(body.beneficiaryId)
      const requestHash = hashWithdrawalRequest(body)

      return guard.runOutflow({
        amount: body.amount,
        date: body.withdrawalDate,
        // Un rejeu d'une requête déjà terminée est rendu tel quel, avant tout contrôle de solde.
        preflight: async (dbSession) => {
          const existing = await IdempotencyKey.findOne({ actor: actor.userId, key: idempotencyKey }).session(dbSession)
          return existing ? replayOf(existing, requestHash) : undefined
        },
        write: async (dbSession) => {
          const [key] = await IdempotencyKey.create(
            [{ key: idempotencyKey, actor: actor.userId, endpoint: CREATE_ENDPOINT, requestHash, expiresAt: new Date(systemNow.getTime() + IDEMPOTENCY_KEY_TTL_MS) }],
            { session: dbSession },
          )
          const [created] = await Withdrawal.create(
            [{ beneficiary: beneficiary._id, amount: body.amount, withdrawalDate: body.withdrawalDate, reason: body.reason, recordedBy: actor.userId }],
            { session: dbSession },
          )
          await recordAudit(
            { actor: actor.userId, actorName: actor.name, action: 'WITHDRAWAL_CREATED', resourceType: 'WITHDRAWAL', resourceId: created._id, after: toAuditSnapshot(created), meta },
            { dbSession },
          )
          const { byId } = await directory(dbSession)
          const response = { statusCode: 201, body: { data: { withdrawal: toWithdrawalView(created.toObject(), byId) } } }
          key.status = 'COMPLETED'
          key.response = response
          key.resourceType = 'WITHDRAWAL'
          key.resourceId = created._id
          key.completedAt = systemNow
          await key.save({ session: dbSession })
          return { replayed: false, ...response }
        },
      })
    },

    /** Liste paginée, recherchée, filtrée et triée (les paramètres sont déjà validés). */
    async list(query) {
      const [{ byId }, withdrawals] = await Promise.all([directory(), activeWithdrawals()])
      return listWithdrawals(withdrawals, byId, query)
    },

    async get(id) {
      const found = await findActive(id)
      const { byId } = await directory()
      return toWithdrawalView(found.toObject(), byId)
    },

    /** Indicateurs, derniers retraits et solde disponible (solde = celui de la trésorerie, jamais recalculé ici). */
    async summary() {
      const now = clock()
      const [{ users, byId }, withdrawals, treasury] = await Promise.all([directory(), activeWithdrawals(), treasuryService.getBalance()])
      const partners = users.map((user) => ({ id: String(user._id), name: user.name, partnerNumber: user.partnerNumber }))
      return {
        ...summarizeWithdrawals(withdrawals, byId, partners),
        partners,
        treasury: { balance: treasury.balance, asOf: treasury.asOf },
        currency: 'XOF',
        timeZone: 'Africa/Dakar',
        generatedAt: now.toISOString(),
      }
    },

    /**
     * Modifie un retrait (bénéficiaire, montant, date, motif). Seule une AUGMENTATION du montant consomme de la trésorerie :
     * elle doit tenir dans le solde actuel ; une baisse, un changement de date ou de bénéficiaire ne peuvent pas le rendre négatif.
     */
    async update({ actor, id, changes, meta = {} }) {
      if (changes.beneficiaryId) await assertActiveBeneficiary(changes.beneficiaryId)
      return guard.runLocked(async (dbSession, { balanceBefore, today }) => {
        const current = await findActive(id, dbSession)
        const before = toAuditSnapshot(current)
        const next = {
          beneficiary: changes.beneficiaryId ?? before.beneficiary,
          amount: changes.amount ?? before.amount,
          withdrawalDate: changes.withdrawalDate ?? before.withdrawalDate,
          reason: changes.reason === undefined ? before.reason : changes.reason,
        }
        const unchanged = ['beneficiary', 'amount', 'withdrawalDate', 'reason'].every((field) => next[field] === before[field])
        const { byId } = await directory(dbSession)
        if (unchanged) return { changed: false, withdrawal: toWithdrawalView(current.toObject(), byId) }

        if (next.withdrawalDate > today) throw fieldError(422, 'OUTFLOW_DATE_IN_FUTURE', 'withdrawalDate', "Un retrait ne peut pas être daté dans le futur : il n'a pas encore eu lieu.")
        const increase = next.amount - before.amount
        if (increase > balanceBefore) {
          throw businessError(409, 'INSUFFICIENT_TREASURY', `Trésorerie insuffisante : ${balanceBefore} FCFA disponibles, ${increase} FCFA supplémentaires demandés.`)
        }

        current.set({ beneficiary: next.beneficiary, amount: next.amount, withdrawalDate: next.withdrawalDate, reason: next.reason })
        await current.save({ session: dbSession })
        await recordAudit(
          { actor: actor.userId, actorName: actor.name, action: 'WITHDRAWAL_UPDATED', resourceType: 'WITHDRAWAL', resourceId: current._id, before, after: toAuditSnapshot(current), meta },
          { dbSession },
        )
        return { changed: true, withdrawal: toWithdrawalView(current.toObject(), byId) }
      })
    },

    /** Suppression LOGIQUE : le retrait n'est plus compté ; la trésorerie ne peut que remonter, aucun contrôle de solde n'est nécessaire. */
    async remove({ actor, id, reason = null, meta = {} }) {
      return guard.runLocked(async (dbSession) => {
        const current = await findActive(id, dbSession)
        const before = toAuditSnapshot(current)
        current.markDeleted({ by: actor.userId, reason })
        await current.save({ session: dbSession })
        await recordAudit(
          { actor: actor.userId, actorName: actor.name, action: 'WITHDRAWAL_DELETED', resourceType: 'WITHDRAWAL', resourceId: current._id, before, after: { deleted: true, deletionReason: reason }, meta },
          { dbSession },
        )
        return { id: String(current._id), deleted: true }
      })
    },
  }
}

