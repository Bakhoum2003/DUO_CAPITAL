import { MOCK_WITHDRAWALS } from '../data/historyMockData'
import { buildHistoryEntries } from '../utils/historyBuilders'
import { getBusinesses, getOperations } from './businessService'
import { getContributions } from './contributionsService'

// Pour l'instant l'Historique est assemblé à partir des données de démonstration des autres modules.
// Plus tard, cette fonction appellera le backend (une seule route d'historique), sans autre changement.
export async function getHistoryEntries() {
  const [contributions, businesses, operations] = await Promise.all([
    getContributions(),
    getBusinesses(),
    getOperations(),
  ])
  const withdrawals = MOCK_WITHDRAWALS.map((withdrawal) => ({ ...withdrawal }))

  return buildHistoryEntries({ contributions, businesses, operations, withdrawals })
}
