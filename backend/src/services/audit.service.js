import { AuditLog } from '../models/AuditLog.js'

const truncate = (value, max) => (typeof value === 'string' && value.length > max ? value.slice(0, max) : value)

/**
 * Ajoute une entrée au journal d'audit (jamais de secret dans before/after : le modèle les refuse).
 * @param {object} entry { actorType?, actor, actorName?, action, resourceType, resourceId, before?, after?, meta? }
 * @param {{ dbSession?: import('mongoose').ClientSession }} [options] session de transaction éventuelle
 */
export async function recordAudit({ actorType, actor, actorName, action, resourceType, resourceId, before, after, meta = {} }, { dbSession } = {}) {
  await AuditLog.create(
    [
      {
        actorType,
        actor,
        actorName: truncate(actorName, 80),
        action,
        resourceType,
        resourceId,
        before,
        after,
        requestId: truncate(meta.requestId, 64),
        ipAddress: truncate(meta.ipAddress, 64),
      },
    ],
    { session: dbSession },
  )
}
