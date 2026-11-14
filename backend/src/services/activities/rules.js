// Règles de statut d'une activité : fonctions PURES.
//
// Statuts : ACTIVE, SUSPENDED (suspendue), COMPLETED (terminée), ARCHIVED (archivée).
// Transitions autorisées :
//   suspend    ACTIVE → SUSPENDED
//   reactivate SUSPENDED → ACTIVE
//   complete   ACTIVE | SUSPENDED → COMPLETED   (date de fin obligatoire)
//   reopen     COMPLETED → ACTIVE               (motif obligatoire, tracé dans reopenHistory : règle explicite du modèle)
//   archive    ACTIVE | SUSPENDED | COMPLETED → ARCHIVED
// Une activité ARCHIVÉE est définitive : aucune sortie, aucune modification. Une activité ne se supprime jamais.

export const ACTIVITY_STATUSES = Object.freeze(['ACTIVE', 'SUSPENDED', 'COMPLETED', 'ARCHIVED'])

const TRANSITIONS = Object.freeze({
  suspend: { from: ['ACTIVE'], to: 'SUSPENDED' },
  reactivate: { from: ['SUSPENDED'], to: 'ACTIVE' },
  complete: { from: ['ACTIVE', 'SUSPENDED'], to: 'COMPLETED' },
  reopen: { from: ['COMPLETED'], to: 'ACTIVE' },
  archive: { from: ['ACTIVE', 'SUSPENDED', 'COMPLETED'], to: 'ARCHIVED' },
})

export const TRANSITION_ACTIONS = Object.freeze(Object.keys(TRANSITIONS))

/** Nouveau statut si la transition est permise, sinon null. */
export function nextStatus(status, action) {
  const transition = TRANSITIONS[action]
  return transition && transition.from.includes(status) ? transition.to : null
}

/** Actions proposées pour un statut (« edit » + transitions possibles). Source unique pour le frontend. */
export function allowedActions(status) {
  return [...(status === 'ARCHIVED' ? [] : ['edit']), ...TRANSITION_ACTIONS.filter((action) => nextStatus(status, action) !== null)]
}
