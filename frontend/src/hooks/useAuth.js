import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

/** État et actions d'authentification : { status, user, errorMessage, notice, login, logout, retry }. */
export default function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé sous <AuthProvider>.')
  return context
}
