/**
 * Envoie une réponse de succès au format commun de l'API : { "data": ... } (et "meta" si fourni).
 *
 * @param {import('express').Response} res
 * @param {unknown} data contenu de la réponse
 * @param {object} [options]
 * @param {number} [options.status] statut HTTP (200 par défaut)
 * @param {object} [options.meta] informations complémentaires (pagination, totaux…)
 */
export function sendSuccess(res, data, { status = 200, meta } = {}) {
  const body = meta === undefined ? { data } : { data, meta }
  return res.status(status).json(body)
}
