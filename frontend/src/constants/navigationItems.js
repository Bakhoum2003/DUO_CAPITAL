import { BriefcaseIcon, ChartLineIcon, ClockRotateLeftIcon, GaugeHighIcon, GearIcon, HandHoldingDollarIcon, MoneyBillTransferIcon, WalletIcon } from '../icons'
import { ROUTES } from '../routes/routePaths'

export const NAVIGATION_ITEMS = [
  { label: 'Tableau de bord', mobileLabel: 'Accueil', to: ROUTES.DASHBOARD, icon: GaugeHighIcon },
  { label: 'Cotisations', to: ROUTES.CONTRIBUTIONS, icon: HandHoldingDollarIcon },
  { label: 'Trésorerie', to: ROUTES.TREASURY, icon: WalletIcon },
  { label: 'Retraits', to: ROUTES.WITHDRAWALS, icon: MoneyBillTransferIcon },
  { label: 'Activités', to: ROUTES.ACTIVITIES, icon: BriefcaseIcon },
  { label: 'Historique', to: ROUTES.HISTORY, icon: ClockRotateLeftIcon },
  { label: 'Statistiques', to: ROUTES.STATISTICS, icon: ChartLineIcon },
  { label: 'Paramètres', to: ROUTES.SETTINGS, icon: GearIcon },
]

// Rubriques affichées dans la barre du bas sur mobile ; les autres restent dans le menu complet (bouton « Menu »).
export const MOBILE_PRIMARY_ROUTES = [ROUTES.DASHBOARD, ROUTES.CONTRIBUTIONS, ROUTES.TREASURY, ROUTES.WITHDRAWALS]
