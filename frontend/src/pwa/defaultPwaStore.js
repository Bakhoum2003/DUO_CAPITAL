import { createPwaStore } from './pwaStore'

/** Instance unique utilisée par l'application (les tests créent la leur avec createPwaStore). */
export const pwaStore = createPwaStore()
