import { Navigate, Outlet, useLocation } from 'react-router-dom'
import FormError from '../components/common/FormError'
import PrimaryButton from '../components/common/PrimaryButton'
import useAuth from '../hooks/useAuth'
import { decideProtectedRoute } from './authGuard'
import { ROUTES } from './routePaths'

/**
 * Protège les pages privées (route « layout »). Attend la fin de la vérification de session avant d'afficher
 * quoi que ce soit : jamais de flash du dashboard. Ce n'est qu'un confort d'interface : le serveur vérifie
 * l'authentification à chaque requête protégée.
 */
function RequireAuth() {
  const { status, errorMessage, retry } = useAuth()
  const location = useLocation()
  const decision = decideProtectedRoute(status)

  if (decision === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p role="status" className="text-sm text-ink-soft">
          Vérification de votre session…
        </p>
      </div>
    )
  }

  if (decision === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6">
        <div className="w-full max-w-md space-y-4">
          <FormError variant="banner" message={errorMessage} />
          <PrimaryButton label="Réessayer" onClick={retry} />
        </div>
      </div>
    )
  }

  if (decision === 'redirect-login') {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  return <Outlet />
}

export default RequireAuth
