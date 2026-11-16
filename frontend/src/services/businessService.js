import { MOCK_BUSINESSES, MOCK_OPERATIONS } from '../data/businessMockData'

export async function getBusinesses() {
  return MOCK_BUSINESSES.map((business) => ({ ...business }))
}

export async function getOperations() {
  return MOCK_OPERATIONS.map((operation) => ({ ...operation }))
}
