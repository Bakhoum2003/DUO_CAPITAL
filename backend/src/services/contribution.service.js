// - l'auteur vient de la session ; l'associé concerné est vérifié en base (existant ET actif) ;
// - un double envoi est neutralisé par une clé d'idempotence (réservation + écriture + audit dans UNE transaction) ;
// - un versement identique (associé, montant, date, mois) enregistré très récemment est refusé sauf confirmation explicite.

import mongoose from 'mongoose'
import { MONTHLY_CONTRIBUTION_PER_PARTNER } from '../config/constants.js'
import { Contribution } from '../models/Contribution.js'
import { IDEMPOTENCY_KEY_TTL_MS } from '../models/shared/constants.js'
import { IdempotencyKey } from '../models/IdempotencyKey.js'
import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'
import { firstDayOfMonth, monthOf, todayInBusinessZone } from '../utils/businessDates.js'
import { runInTransaction } from '../utils/transaction.js'
import { recordAudit } from './audit.service.js'
import { hashCreateRequest } from './contributions/requestHash.js'
import { computeContributionSummary } from './contributions/summary.js'
import { toContributionView } from './contributionView.js'

export const CREATE_ENDPOINT = 'POST /api/v1/contributions'
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/

const businessError = (status, code, message, fields) => new AppError({ status, code, message, fields })
const fieldError = (status, code, field, message) => businessError(status, code, message, [{ field, message }])

/**
 * @param {object} options
 * @param {{ fund: { startPeriod: string | null } }} options.config
 * @param {() => Date} [options.clock] horloge MÉTIER (date du jour à Dakar) ; injectable dans les tests
 * @param {() => Date} [options.systemClock] heure SYSTÈME, pour les horodatages techniques comparés à `createdAt`
 *   (fenêtre anti-doublon, expiration des clés) : `createdAt` est posé par la base avec l'heure réelle, jamais avec l'horloge métier.
 */
function castForAggregation(filter) {
  return filter.partner ? { ...filter, partner: new mongoose.Types.ObjectId(filter.partner) } : filter
}

export function createContributionService({ config, clock = () => new Date(), systemClock = () => new Date() }) {
  const usersById = async (ids) => {
    const users = await User.find({ _id: { $in: ids } }, { name: 1, partnerNumber: 1 }).lean()
    return new Map(users.map((user) => [String(user._id), user]))
  }

  function assertBusinessRules({ contributionDate, period }, today) {
    const start = config.fund.startPeriod
    if (!start) {
      throw businessError(409, 'FUND_START_NOT_CONFIGURED', "La date de démarrage du fonds n'est pas configurée (FUND_START_PERIOD) : aucune cotisation ne peut être enregistrée.")
    }
    if (contributionDate > today) throw fieldError(422, 'CONTRIBUTION_DATE_IN_FUTURE', 'contributionDate', "La date du versement ne peut pas être postérieure à aujourd'hui.")
    if (contributionDate < firstDayOfMonth(start)) {
      throw fieldError(422, 'BEFORE_FUND_START', 'contributionDate', `Le fonds démarre en ${start} : aucune cotisation ne peut être enregistrée avant.`)
    }
    if (period < start) throw fieldError(422, 'PERIOD_BEFORE_FUND_START', 'period', `Le fonds démarre en ${start} : le mois concerné ne peut pas être antérieur.`)
    if (period > monthOf(today)) throw fieldError(422, 'PERIOD_IN_FUTURE', 'period', 'Le mois concerné ne peut pas être postérieur au mois en cours.')
  }

  async function assertActivePartner(partnerId) {
    const partner = OBJECT_ID_PATTERN.test(partnerId) ? await User.findById(partnerId, { name: 1, partnerNumber: 1, status: 1 }).lean() : null
    if (!partner) throw fieldError(404, 'PARTNER_NOT_FOUND', 'partnerId', 'Associé introuvable.')
    if (partner.status !== 'ACTIVE') throw fieldError(409, 'PARTNER_DISABLED', 'partnerId', "Ce compte d'associé est désactivé : aucune cotisation ne peut être enregistrée à son nom.")
    return partner
  }

  function replayOf(record, requestHash) {
    if (record.requestHash !== requestHash) {
      throw businessError(422, 'IDEMPOTENCY_KEY_REUSED', "Cette clé d'envoi a déjà servi pour une autre cotisation.")
    }
    if (record.status === 'COMPLETED') return { replayed: true, statusCode: record.response.statusCode, body: record.response.body }
    throw businessError(409, 'REQUEST_IN_PROGRESS', 'Cet enregistrement est déjà en cours de traitement. Patientez un instant.')
  }

  return {
    /**
     * Enregistre UNE cotisation réelle. Retourne { statusCode, body, replayed }.
     * @param {{ actor: { userId: string, name: string }, body: object, idempotencyKey: string, meta?: object }} input
     */
    async create({ actor, body, idempotencyKey, meta = {} }) {
      const now = clock()
      const systemNow = systemClock()
      const today = todayInBusinessZone(now)
      assertBusinessRules(body, today)
      const partner = await assertActivePartner(body.partnerId)
      const requestHash = hashCreateRequest(body)

      return runInTransaction(async (dbSession) => {
        const existing = await IdempotencyKey.findOne({ actor: actor.userId, key: idempotencyKey }).session(dbSession)
        if (existing) return replayOf(existing, requestHash)

        if (!body.confirmDuplicate) {
          const since = new Date(systemNow.getTime() - DUPLICATE_WINDOW_MS)
          const duplicate = await Contribution.exists({
            partner: partner._id,
            amount: body.amount,
            contributionDate: body.contributionDate,
            period: body.period,
            deletedAt: null,
            createdAt: { $gte: since },
          }).session(dbSession)
          if (duplicate) {
            throw businessError(409, 'DUPLICATE_SUSPECTED', 'Un versement identique vient d\'être enregistré. Confirmez pour enregistrer un second versement identique.')
          }
        }

        const [key] = await IdempotencyKey.create(
          [{ key: idempotencyKey, actor: actor.userId, endpoint: CREATE_ENDPOINT, requestHash, expiresAt: new Date(systemNow.getTime() + IDEMPOTENCY_KEY_TTL_MS) }],
          { session: dbSession },
        )
        const [created] = await Contribution.create(
          [{ partner: partner._id, amount: body.amount, contributionDate: body.contributionDate, period: body.period, note: body.note, recordedBy: actor.userId }],
          { session: dbSession },
        )
        await recordAudit(
          {
            actor: actor.userId,
            actorName: actor.name,
            action: 'CONTRIBUTION_CREATED',
            resourceType: 'CONTRIBUTION',
            resourceId: created._id,
            after: { partner: String(partner._id), amount: body.amount, contributionDate: body.contributionDate, period: body.period, hasNote: Boolean(body.note) },
            meta,
          },
          { dbSession },
        )

        const users = await usersById([partner._id, actor.userId])
        const response = { statusCode: 201, body: { data: { contribution: toContributionView(created.toObject(), users) } } }
        key.status = 'COMPLETED'
        key.response = response
        key.resourceType = 'CONTRIBUTION'
        key.resourceId = created._id
        key.completedAt = systemNow
        await key.save({ session: dbSession })
        return { replayed: false, ...response }
      })
    },

    async list(query) {
      const filter = { deletedAt: null }
      if (query.partnerId) filter.partner = query.partnerId
      if (query.period) filter.period = query.period
      if (query.year) filter.period = query.period ?? { $gte: `${query.year}-01`, $lte: `${query.year}-12` }
      if (query.year && query.period && !query.period.startsWith(query.year)) filter.period = { $in: [] } // année et mois contradictoires : aucun résultat
      if (query.from || query.to) {
        filter.contributionDate = { ...(query.from && { $gte: query.from }), ...(query.to && { $lte: query.to }) }
      }

      const skip = (query.page - 1) * query.pageSize
      const [items, total, totals] = await Promise.all([
        Contribution.find(filter).sort({ contributionDate: -1, createdAt: -1, _id: -1 }).skip(skip).limit(query.pageSize).lean(),
        Contribution.countDocuments(filter),
        Contribution.aggregate([{ $match: castForAggregation(filter) }, { $group: { _id: null, amount: { $sum: '$amount' } } }]),
      ])
      const users = await usersById([...new Set(items.flatMap((item) => [String(item.partner), String(item.recordedBy)]))])
      return {
        contributions: items.map((item) => toContributionView(item, users)),
        meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)), filteredAmount: totals[0]?.amount ?? 0 },
      }
    },

    async get(id) {
      const found = OBJECT_ID_PATTERN.test(id) ? await Contribution.findOne({ _id: id, deletedAt: null }).lean() : null
      if (!found) throw businessError(404, 'CONTRIBUTION_NOT_FOUND', 'Cotisation introuvable.')
      return toContributionView(found, await usersById([String(found.partner), String(found.recordedBy)]))
    },

    async summary() {
      const now = clock()
      const [users, contributions] = await Promise.all([
        User.find({}, { name: 1, partnerNumber: 1 }).sort({ partnerNumber: 1 }).lean(),
        Contribution.find({ deletedAt: null }, { partner: 1, amount: 1, period: 1, contributionDate: 1 }).lean(),
      ])
      return {
        ...computeContributionSummary({
          today: todayInBusinessZone(now),
          fundStartPeriod: config.fund.startPeriod,
          monthlyTarget: MONTHLY_CONTRIBUTION_PER_PARTNER,
          partners: users.map((user) => ({ id: String(user._id), name: user.name, partnerNumber: user.partnerNumber })),
          contributions,
        }),
        currency: 'XOF',
        timeZone: 'Africa/Dakar',
        generatedAt: now.toISOString(),
      }
    },
  }
}
