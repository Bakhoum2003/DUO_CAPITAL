import { BriefcaseIcon, ChartLineIcon, FileLinesIcon, PlusIcon } from '../icons'
import { ROUTES } from '../routes/routePaths'

// Boutons des « Actions rapides ». Les pages cibles sont provisoires pour le moment.
export const QUICK_ACTIONS = [
  { id: 'add-contribution', label: 'Enregistrer\nune cotisation', to: ROUTES.CONTRIBUTIONS, icon: PlusIcon, tone: 'green' },
  { id: 'add-business', label: 'Ajouter\nun business', to: ROUTES.BUSINESS, icon: BriefcaseIcon, tone: 'blue' },
  { id: 'view-statistics', label: 'Voir mes\nstatistiques', to: ROUTES.STATISTICS, icon: ChartLineIcon, tone: 'orange' },
  { id: 'view-history', label: "Consulter\nl'historique", to: ROUTES.HISTORY, icon: FileLinesIcon, tone: 'violet' },
]
