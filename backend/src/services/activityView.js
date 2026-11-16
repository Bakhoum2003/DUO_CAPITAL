import { allowedActions } from './activities/rules.js'

const idOf = (value) => (value == null ? null : String(value._id ?? value))
const iso = (value) => (value instanceof Date ? value.toISOString() : (value ?? null))

/** Associé affiché par son nom seulement (jamais d'email ni de secret). */
const personOf = (value, users) => (value == null ? null : { id: idOf(value), name: users.get(idOf(value))?.name ?? null })

export function userIdsOf(activity) {
  return [activity.createdBy, activity.completedBy, activity.archivedBy, ...(activity.reopenHistory ?? []).map((entry) => entry.reopenedBy)]
    .filter(Boolean)
    .map(idOf)
}

/** @param {object} activity document (lean ou toObject) @param {Map<string, {name: string}>} users */
export function toActivityView(activity, users, { operationsCount } = {}) {
  return {
    id: String(activity._id),
    name: activity.name,
    description: activity.description ?? '',
    category: activity.category ?? null,
    status: activity.status,
    startDate: activity.startDate,
    endDate: activity.endDate ?? null,
    completedAt: iso(activity.completedAt),
    archivedAt: iso(activity.archivedAt),
    createdAt: iso(activity.createdAt),
    updatedAt: iso(activity.updatedAt),
    createdBy: personOf(activity.createdBy, users),
    completedBy: personOf(activity.completedBy, users),
    archivedBy: personOf(activity.archivedBy, users),
    reopenHistory: (activity.reopenHistory ?? []).map((entry) => ({
      reopenedAt: iso(entry.reopenedAt),
      reopenedBy: personOf(entry.reopenedBy, users),
      reason: entry.reason,
      previousEndDate: entry.previousEndDate ?? null,
    })),
    allowedActions: allowedActions(activity.status),
    ...(operationsCount === undefined ? {} : { operationsCount }),
  }
}
