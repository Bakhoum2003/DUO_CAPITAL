import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import DashboardHeader from '../components/dashboard/DashboardHeader'
import PwaNotices from '../components/pwa/PwaNotices'
import LogoutConfirmDialog from '../components/dashboard/LogoutConfirmDialog'
import MobileBottomNav from '../components/dashboard/MobileBottomNav'
import Sidebar from '../components/dashboard/Sidebar'
import { MOBILE_PRIMARY_ROUTES, NAVIGATION_ITEMS } from '../constants/navigationItems'
import FormError from '../components/common/FormError'
import useAuth from '../hooks/useAuth'
import { ROUTES } from '../routes/routePaths'
import { formatCompactDate, formatLongDate } from '../utils/formatters'
import { isMenuActive, splitMobileNavigation } from '../utils/mobileNavigation'
import { createLogoutRunner } from '../utils/logoutFlow'
import { buildWelcomeTitle } from '../utils/welcomeMessage'

function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const [logoutError, setLogoutError] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const runLogout = useMemo(() => createLogoutRunner(logout), [logout])
  const { primary: mobilePrimaryItems } = useMemo(() => splitMobileNavigation(NAVIGATION_ITEMS, MOBILE_PRIMARY_ROUTES), [])

  useEffect(() => {
    if (!isSidebarOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsSidebarOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSidebarOpen])

  const isDashboard = pathname === ROUTES.DASHBOARD
  const activeItem = NAVIGATION_ITEMS.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
  const headerTitle = isDashboard ? buildWelcomeTitle(user) : (activeItem?.label ?? '')
  const headerSubtitle = isDashboard ? 'Voici un aperçu de votre activité ce mois-ci.' : ''

  // Déconnexion réelle : le serveur révoque la session. Si le serveur ne confirme pas, l'utilisateur reste connecté
  const handleLogout = async () => {
    if (isLoggingOut) return
    setLogoutError('')
    setIsLoggingOut(true)
    const result = await runLogout()
    if (result.skipped) return
    if (!result.ok) {
      setLogoutError(result.message)
      setIsLoggingOut(false)
      setIsLogoutDialogOpen(false)
    }
  }

  const today = new Date()

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar
        navigationItems={NAVIGATION_ITEMS}
        userName={user.fullName}
        userRole={user.role}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={() => setIsLogoutDialogOpen(true)}
      />

      <div className="lg:pl-60">
        <DashboardHeader
          title={headerTitle}
          subtitle={headerSubtitle}
          dateLabel={formatLongDate(today)}
          compactDateLabel={formatCompactDate(today)}
          userInitials={user.initials}
          onOpenMenu={() => setIsSidebarOpen(true)}
        />

        <main className="px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 md:pb-10">
          <PwaNotices className="mb-4 space-y-2" />
          {logoutError && (
            <div className="mb-4">
              <FormError variant="banner" message={logoutError} />
            </div>
          )}
          <Outlet />
        </main>
      </div>

      <MobileBottomNav
        primaryItems={mobilePrimaryItems}
        isMenuActive={isMenuActive(pathname, mobilePrimaryItems)}
        isMenuOpen={isSidebarOpen}
        onOpenMenu={() => setIsSidebarOpen(true)}
      />

      {isLogoutDialogOpen && (
        <LogoutConfirmDialog
          isSubmitting={isLoggingOut}
          onConfirm={handleLogout}
          onClose={() => setIsLogoutDialogOpen(false)}
        />
      )}
    </div>
  )
}

export default DashboardLayout
