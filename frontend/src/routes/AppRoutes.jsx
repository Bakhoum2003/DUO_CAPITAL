import { Navigate, Route, Routes } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import DashboardLayout from '../layouts/DashboardLayout'
import AuthProvider from '../context/AuthContext'
import PreferencesProvider from '../context/PreferencesContext'
import RemindersProvider from '../context/RemindersContext'
import LoginPage from '../pages/auth/LoginPage'
import ActivitiesPage from '../pages/activities/ActivitiesPage'
import ActivityDetailsPage from '../pages/activities/ActivityDetailsPage'
import ContributionsPage from '../pages/contributions/ContributionsPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import HistoryPage from '../pages/history/HistoryPage'
import SettingsPage from '../pages/settings/SettingsPage'
import StatisticsPage from '../pages/statistics/StatisticsPage'
import TreasuryPage from '../pages/treasury/TreasuryPage'
import WithdrawalsPage from '../pages/withdrawals/WithdrawalsPage'
import PublicOnlyRoute from './PublicOnlyRoute'
import RequireAuth from './RequireAuth'
import { ROUTES } from './routePaths'

/**
 * Table des routes de l'application.
 * - AuthProvider enveloppe tout : il vérifie la session auprès du serveur au démarrage
 * - Connexion (AuthLayout), réservée aux visiteurs non connectés. Il n'y a pas d'inscription : les deux comptes sont créés par le serveur.
 * - Pages connectées (DashboardLayout), protégées par RequireAuth : Dashboard, Cotisations, Trésorerie, Retraits, Activités commerciales, Historique, Statistiques et Paramètres
 * La racine et toute adresse inconnue redirigent vers la connexion (puis vers le dashboard si une session existe).
 */
function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthProvider />}>
        <Route element={<PublicOnlyRoute />}>
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<PreferencesProvider />}>
            <Route element={<RemindersProvider />}>
              <Route element={<DashboardLayout />}>
                <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
                <Route path={ROUTES.CONTRIBUTIONS} element={<ContributionsPage />} />
                <Route path={ROUTES.TREASURY} element={<TreasuryPage />} />
                <Route path={ROUTES.WITHDRAWALS} element={<WithdrawalsPage />} />
                <Route path={ROUTES.ACTIVITIES} element={<ActivitiesPage />} />
                <Route path={ROUTES.ACTIVITY_DETAILS} element={<ActivityDetailsPage />} />
                <Route path={ROUTES.BUSINESS} element={<Navigate to={ROUTES.ACTIVITIES} replace />} />
                <Route path={ROUTES.BUSINESS_DETAILS} element={<Navigate to={ROUTES.ACTIVITIES} replace />} />
                <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
                <Route path={ROUTES.STATISTICS} element={<StatisticsPage />} />
                <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
