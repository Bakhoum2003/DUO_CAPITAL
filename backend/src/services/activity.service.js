// - aucune suppression, jamais : une activité s'archive (le modèle interdit la suppression physique) ;
// - chaque écriture est tracée dans AuditLog, dans la même transaction que la modification.

import { Business } from '../models/Business.js'
import { BusinessOperation } from '../models/BusinessOperation.js'
import { MAX_REOPEN_HISTORY_ENTRIES } from '../models/shared/constants.js'
import { toNameKey } from '../models/shared/validators.js'
import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'
import { todayInBusinessZone } from '../utils/businessDates.js'
import { runInTransaction } from '../utils/transaction.js'
import { isObjectId } from '../validation/activity.schemas.js'
import { nextStatus } from './activities/rules.js'
import { toActivityView, userIdsOf } from './activityView.js'
import { recordAudit } from './audit.service.js'

const SORTS = {
  start_desc: { startDate: -1, _id: -1 },
  start_asc: { startDate: 1, _id: 1 },
  name_asc: { nameKey: 1, _id: 1 },
  name_desc: { nameKey: -1, _id: -1 },
  created_desc: { createdAt: -1, _id: -1 },
}
const AUDIT_ACTIONS = {
  suspend: 'BUSINESS_SUSPENDED',
  reactivate: 'BUSINESS_REACTIVATED',
  complete: 'BUSINESS_COMPLETED',
  reopen: 'BUSINESS_REOPENED',
  archive: 'BUSINESS_ARCHIVED',
}
const TRANSITION_LABELS = { suspend: 'suspendue', reactivate: 'réactivée', complete: 'terminée', reopen: 'rouverte', archive: 'archivée' }
const EDITABLE_FIELDS = ['name', 'description', 'category', 'startDate', 'endDate']

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const fail = (status, code, message, fields) => new AppError({ status, code, message, fields })
const notFound = () => fail(404, 'ACTIVITY_NOT_FOUND', 'Activité introuvable.')

function assertValidId(id) {
  if (!isObjectId(id)) throw fail(400, 'INVALID_ID', "L'identifiant de l'activité est invalide.")
}

function mapConflict(error) {
  if (error?.name === 'VersionError') {
    throw fail(409, 'ACTIVITY_CONFLICT', "Cette activité vient d'être modifiée ailleurs. Actualisez la page puis recommencez.")
  }
  throw error
}

/**
 * @param {{ clock?: () => Date }} [options] horloge métier (date du jour à Dakar)
 */
export function createActivityService({ clock = () => new Date() } = {}) {
  async function usersById(ids) {
    const unique = [...new Set(ids)]
    const users = unique.length ? await User.find({ _id: { $in: unique } }, { name: 1 }).lean() : []
    return new Map(users.map((user) => [String(user._id), user]))
  }

  async function viewOf(activity, extras) {
    return toActivityView(activity, await usersById(userIdsOf(activity)), extras)
  }

  async function operationTotals(businessId, session) {
    const rows = await BusinessOperation.aggregate([
      { $match: { business: businessId, deletedAt: null } },
      { $group: { _id: '$type', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]).session(session ?? null)
    const by = Object.fromEntries(rows.map((row) => [row._id, { amount: row.amount, count: row.count }]))
    const pick = (type) => by[type] ?? { amount: 0, count: 0 }
    return { investments: pick('INVESTMENT'), expenses: pick('EXPENSE'), revenues: pick('REVENUE') }
  }

  async function operationDateBounds(businessId, session) {
    const [row] = await BusinessOperation.aggregate([
      { $match: { business: businessId, deletedAt: null } },
      { $group: { _id: null, first: { $min: '$operationDate' }, last: { $max: '$operationDate' } } },
    ]).session(session ?? null)
    return row ? { first: row.first, last: row.last } : null
  }

  async function assertNameAvailable(name, exceptId, session) {
    const filter = { nameKey: toNameKey(name), status: { $ne: 'ARCHIVED' } }
    if (exceptId) filter._id = { $ne: exceptId }
    if (await Business.exists(filter).session(session ?? null)) {
      throw fail(409, 'ACTIVITY_NAME_ALREADY_USED', 'Une activité portant ce nom existe déjà.', [{ field: 'name', message: 'Une activité portant ce nom existe déjà.' }])
    }
  }

  const audit = (actor, action, activity, details, meta, dbSession) =>
    recordAudit({ actor: actor.userId, actorName: actor.name, action, resourceType: 'BUSINESS', resourceId: activity._id, ...details, meta }, { dbSession })

  return {
    async list(query) {
      const filter = {}
      filter.status = query.status ?? { $ne: 'ARCHIVED' } // les archivées ne s'affichent que si on les demande
      if (query.search) filter.nameKey = { $regex: escapeRegex(toNameKey(query.search)) }
      if (query.category) filter.category = query.category

      const skip = (query.page - 1) * query.pageSize
      const [items, total, statusRows, categories] = await Promise.all([
        Business.find(filter).sort(SORTS[query.sort]).skip(skip).limit(query.pageSize).lean(),
        Business.countDocuments(filter),
        Business.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Business.distinct('category', { category: { $ne: null } }),
      ])
      const counts = { total: 0, ACTIVE: 0, SUSPENDED: 0, COMPLETED: 0, ARCHIVED: 0 }
      for (const row of statusRows) {
        if (row._id in counts) counts[row._id] = row.count
        counts.total += row.count
      }

      const ids = items.map((item) => item._id)
      const opRows = ids.length
        ? await BusinessOperation.aggregate([{ $match: { business: { $in: ids }, deletedAt: null } }, { $group: { _id: '$business', count: { $sum: 1 } } }])
        : []
      const opCounts = new Map(opRows.map((row) => [String(row._id), row.count]))
      const users = await usersById(items.flatMap(userIdsOf))

      return {
        activities: items.map((item) => toActivityView(item, users, { operationsCount: opCounts.get(String(item._id)) ?? 0 })),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
          counts,
          categories: categories.filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr')),
        },
      }
    },

    /** Détail : informations, historique, et totaux financiers EN LECTURE SEULE (les opérations ne sont pas gérées ici). */
    async get(id) {
      assertValidId(id)
      const activity = await Business.findById(id).lean()
      if (!activity) throw notFound()
      const totals = await operationTotals(activity._id)
      const view = await viewOf(activity, { operationsCount: totals.investments.count + totals.expenses.count + totals.revenues.count })
      return { ...view, financials: { ...totals, result: totals.revenues.amount - totals.expenses.amount } }
    },

    async create({ actor, body, meta = {} }) {
      await assertNameAvailable(body.name)
      const created = await runInTransaction(async (dbSession) => {
        await assertNameAvailable(body.name, null, dbSession)
        const [activity] = await Business.create(
          [{ name: body.name, description: body.description, category: body.category, startDate: body.startDate, endDate: body.endDate, status: 'ACTIVE', createdBy: actor.userId }],
          { session: dbSession },
        )
        await audit(actor, 'BUSINESS_CREATED', activity, { after: { name: activity.name, category: activity.category, startDate: activity.startDate, status: 'ACTIVE' } }, meta, dbSession)
        return activity.toObject()
      })
      return viewOf(created, { operationsCount: 0 })
    },

    async update({ id, actor, body, meta = {} }) {
      assertValidId(id)
      try {
        const updated = await runInTransaction(async (dbSession) => {
          const activity = await Business.findById(id).session(dbSession)
          if (!activity) throw notFound()
          if (activity.status === 'ARCHIVED') throw fail(409, 'ACTIVITY_ARCHIVED', 'Une activité archivée ne peut plus être modifiée.')

          const before = {}
          const after = {}
          for (const field of EDITABLE_FIELDS) {
            if (!(field in body)) continue
            const value = body[field]
            const current = activity[field] ?? (field === 'description' ? '' : null)
            const next = value ?? (field === 'description' ? '' : null)
            if (next !== current) {
              before[field] = current
              after[field] = next
            }
          }
          if (Object.keys(after).length === 0) return activity.toObject() // rien à changer : aucune écriture, aucun audit

          if ('name' in after) await assertNameAvailable(after.name, activity._id, dbSession)
          if ('endDate' in after && after.endDate === null && activity.status === 'COMPLETED') {
            throw fail(422, 'END_DATE_REQUIRED', 'Une activité terminée doit garder une date de fin.', [{ field: 'endDate', message: 'La date de fin est obligatoire pour une activité terminée.' }])
          }
          const startDate = after.startDate ?? activity.startDate
          const endDate = 'endDate' in after ? after.endDate : activity.endDate
          if (endDate && endDate < startDate) throw fail(422, 'INVALID_DATES', 'La date de fin ne peut pas précéder la date de début.', [{ field: 'endDate', message: 'La date de fin ne peut pas précéder la date de début.' }])

          // Les dates doivent rester cohérentes avec l'historique financier existant.
          if ('startDate' in after || 'endDate' in after) {
            const bounds = await operationDateBounds(activity._id, dbSession)
            if (bounds && startDate > bounds.first) throw fail(409, 'START_DATE_AFTER_OPERATIONS', `Des opérations existent dès le ${bounds.first} : la date de démarrage ne peut pas être postérieure.`, [{ field: 'startDate', message: 'Postérieure à la première opération enregistrée.' }])
            if (bounds && activity.status === 'COMPLETED' && endDate < bounds.last) throw fail(409, 'END_DATE_BEFORE_OPERATIONS', `Des opérations existent jusqu'au ${bounds.last} : la date de fin ne peut pas être antérieure.`, [{ field: 'endDate', message: 'Antérieure à la dernière opération enregistrée.' }])
          }

          for (const [field, value] of Object.entries(after)) activity.set(field, value)
          await activity.save({ session: dbSession })
          await audit(actor, 'BUSINESS_UPDATED', activity, { before, after }, meta, dbSession)
          return activity.toObject()
        })
        return await viewOf(updated)
      } catch (error) {
        return mapConflict(error)
      }
    },

    async transition({ id, action, actor, body = {}, meta = {} }) {
      assertValidId(id)
      const now = clock()
      try {
        const updated = await runInTransaction(async (dbSession) => {
          const activity = await Business.findById(id).session(dbSession)
          if (!activity) throw notFound()

          const target = nextStatus(activity.status, action)
          if (!target) {
            throw fail(409, 'INVALID_STATUS_TRANSITION', `Cette activité ne peut pas être ${TRANSITION_LABELS[action]} depuis son état actuel.`)
          }

          const from = activity.status
          const before = { status: from, endDate: activity.endDate ?? null }
          activity.status = target

          if (action === 'complete') {
            const endDate = body.endDate ?? todayInBusinessZone(now)
            if (endDate < activity.startDate) throw fail(422, 'INVALID_DATES', 'La date de fin ne peut pas précéder la date de début.', [{ field: 'endDate', message: 'Antérieure à la date de démarrage.' }])
            if (endDate > todayInBusinessZone(now)) throw fail(422, 'END_DATE_IN_FUTURE', "La date de fin ne peut pas être postérieure à aujourd'hui.", [{ field: 'endDate', message: "Postérieure à aujourd'hui." }])
            const bounds = await operationDateBounds(activity._id, dbSession)
            if (bounds && endDate < bounds.last) throw fail(409, 'END_DATE_BEFORE_OPERATIONS', `Des opérations existent jusqu'au ${bounds.last} : la date de fin ne peut pas être antérieure.`, [{ field: 'endDate', message: 'Antérieure à la dernière opération enregistrée.' }])
            activity.endDate = endDate
            activity.completedAt = now
            activity.completedBy = actor.userId
          } else if (action === 'reopen') {
            if (activity.reopenHistory.length >= MAX_REOPEN_HISTORY_ENTRIES) throw fail(409, 'REOPEN_LIMIT_REACHED', 'Le nombre de réouvertures enregistrables est atteint.')
            activity.reopenHistory.push({ reopenedAt: now, reopenedBy: actor.userId, reason: body.reason, previousEndDate: activity.endDate ?? null })
            activity.endDate = null
            activity.completedAt = null
            activity.completedBy = null
          } else if (action === 'archive') {
            activity.archivedAt = now
            activity.archivedBy = actor.userId
          }

          await activity.save({ session: dbSession })
          await audit(
            actor,
            AUDIT_ACTIONS[action],
            activity,
            { before, after: { status: target, endDate: activity.endDate ?? null, ...(action === 'reopen' ? { reason: body.reason } : {}) } },
            meta,
            dbSession,
          )
          return activity.toObject()
        })
        return await viewOf(updated)
      } catch (error) {
        return mapConflict(error)
      }
    },
  }
}
