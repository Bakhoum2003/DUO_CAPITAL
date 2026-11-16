import { getBusinesses } from './businessService'
import { getHistoryEntries } from './historyService'

export async function getStatisticsSource() {
  const [entries, businesses] = await Promise.all([getHistoryEntries(), getBusinesses()])
  return { entries, businesses }
}
