import { MOCK_BUSINESSES, MOCK_OPERATIONS } from '../data/businessMockData'

// Pour l'instant les données sont locales. Plus tard, ces deux fonctions appelleront le backend,
// sans que les hooks ni les composants aient à changer.
export async function getBusinesses() {
  return MOCK_BUSINESSES.map((business) => ({ ...business }))
}

export async function getOperations() {
  return MOCK_OPERATIONS.map((operation) => ({ ...operation }))
}
