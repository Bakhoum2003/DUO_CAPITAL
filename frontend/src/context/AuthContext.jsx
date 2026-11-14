import { createContext, useEffect, useMemo, useSyncExternalStore } from 'react'
import { Outlet } from 'react-router-dom'
import { authStore as defaultStore } from '../auth/defaultAuthStore'
import { toCurrentUserView } from '../utils/userView'

export const AuthContext = createContext(null)

/**
 * Fournisseur d'authentification, utilisé comme route « layout » : il enveloppe toutes les routes via <Outlet />.
 * Au montage il vérifie la session auprès du serveur (GET /api/auth/me) ; rien n'est lu dans le navigateur.
 *
 * Props :
 * - store : état d'authentification (remplaçable dans les tests)
 */
function AuthProvider({ store = defaultStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getState)

  useEffect(() => {
    store.init()
  }, [store])

  const value = useMemo(
    () => ({
      status: state.status,
      user: state.user ? toCurrentUserView(state.user) : null,
      errorMessage: state.errorMessage,
      notice: state.notice,
      login: store.login,
      logout: store.logout,
      retry: store.retry,
    }),
    [state, store],
  )

  return (
    <AuthContext.Provider value={value}>
      <Outlet />
    </AuthContext.Provider>
  )
}

export default AuthProvider
