import { getBusinesses } from './businessService'
import { getHistoryEntries } from './historyService'

// Les statistiques sont calculées à partir des mêmes mouvements que l'Historique et des mêmes business
// que le module Business : aucune donnée statistique indépendante qui pourrait les contredire.
// Plus tard, cette fonction appellera le backend sans autre changement.
export async function getStatisticsSource() {
  const [entries, businesses] = await Promise.all([getHistoryEntries(), getBusinesses()])
  return { entries, businesses }
}
