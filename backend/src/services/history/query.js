// Filtres de l'Historique : fonctions PURES. La période réutilise les intervalles du Dashboard (resolvePeriodRange).

import { resolvePeriodRange } from '../../utils/businessDates.js'

/**
 * Intervalle de dates effectif = période choisie, resserrée par les dates de début / fin éventuelles.
 * @returns {{ from: string | null, to: string | null }} null = pas de borne
 */
export function resolveHistoryRange({ period = 'all', from, to }, today) {
  const range = resolvePeriodRange({ period, from, to }, today)
  const lower = [range.from, from].filter(Boolean).sort().at(-1) ?? null
  const upper = [range.to, to].filter(Boolean).sort()[0] ?? null
  return { from: lower, to: upper }
}

/** Requête de l'Historique (limit) -> requête du registre de trésorerie (pageSize), avec la période résolue. */
export function toLedgerQuery(query, today) {
  const { from, to } = resolveHistoryRange(query, today)
  return {
    search: query.search,
    type: query.type,
    direction: query.direction,
    partnerId: query.partnerId,
    activityId: query.activityId,
    from: from ?? undefined,
    to: to ?? undefined,
    sort: query.sort,
    page: query.page,
    pageSize: query.limit,
  }
}
