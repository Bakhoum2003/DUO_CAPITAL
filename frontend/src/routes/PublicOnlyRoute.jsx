import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import { decidePublicOnlyRoute, getPostLoginPath } from './authGuard'
import { ROUTES } from './routePaths'

function PublicOnlyRoute() {
  const { status } = useAuth()
  const location = useLocation()
  const decision = decidePublicOnlyRoute(status)

  if (decision === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p role="status" className="text-sm text-ink-soft">
          Vérification de votre session…
        </p>
      </div>
    )
  }

  if (decision === 'redirect-app') {
    return <Navigate to={getPostLoginPath(location.state, ROUTES.DASHBOARD, ROUTES.LOGIN)} replace />
  }

  return <Outlet />
}

export default PublicOnlyRoute
