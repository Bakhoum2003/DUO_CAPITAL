import { BriefcaseIcon, ChartLineIcon, ClockRotateLeftIcon, GaugeHighIcon, GearIcon, HandHoldingDollarIcon, MoneyBillTransferIcon, WalletIcon } from '../icons'
import { ROUTES } from '../routes/routePaths'

export const NAVIGATION_ITEMS = [
  { label: 'Tableau de bord', to: ROUTES.DASHBOARD, icon: GaugeHighIcon },
  { label: 'Cotisations', to: ROUTES.CONTRIBUTIONS, icon: HandHoldingDollarIcon },
  { label: 'Trésorerie', to: ROUTES.TREASURY, icon: WalletIcon },
  { label: 'Retraits', to: ROUTES.WITHDRAWALS, icon: MoneyBillTransferIcon },
  { label: 'Activités', to: ROUTES.ACTIVITIES, icon: BriefcaseIcon },
  { label: 'Historique', to: ROUTES.HISTORY, icon: ClockRotateLeftIcon },
  { label: 'Statistiques', to: ROUTES.STATISTICS, icon: ChartLineIcon },
  { label: 'Paramètres', to: ROUTES.SETTINGS, icon: GearIcon },
]
