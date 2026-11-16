
export const ACTIVITY_STATUSES = Object.freeze(['ACTIVE', 'SUSPENDED', 'COMPLETED', 'ARCHIVED'])

const TRANSITIONS = Object.freeze({
  suspend: { from: ['ACTIVE'], to: 'SUSPENDED' },
  reactivate: { from: ['SUSPENDED'], to: 'ACTIVE' },
  complete: { from: ['ACTIVE', 'SUSPENDED'], to: 'COMPLETED' },
  reopen: { from: ['COMPLETED'], to: 'ACTIVE' },
  archive: { from: ['ACTIVE', 'SUSPENDED', 'COMPLETED'], to: 'ARCHIVED' },
})

export const TRANSITION_ACTIONS = Object.freeze(Object.keys(TRANSITIONS))

export function nextStatus(status, action) {
  const transition = TRANSITIONS[action]
  return transition && transition.from.includes(status) ? transition.to : null
}

export function allowedActions(status) {
  return [...(status === 'ARCHIVED' ? [] : ['edit']), ...TRANSITION_ACTIONS.filter((action) => nextStatus(status, action) !== null)]
}
