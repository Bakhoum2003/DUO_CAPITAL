import { RightFromBracketIcon, TrophyIcon, XmarkIcon } from '../../icons'
import BrandWave from '../auth/illustrations/BrandWave'
import Logo from '../common/Logo'
import SidebarItem from './SidebarItem'
import SidebarUserCard from './SidebarUserCard'

/**
 * Barre latérale de navigation.
 * - Ordinateur : fixe à gauche.
 * - Tablette et mobile : tiroir qui glisse depuis la gauche, avec un fond assombri.
 *
 * Props :
 * - navigationItems : liste { label, to, icon } des liens
 * - userName, userRole : utilisateur affiché en bas
 * - isOpen : le tiroir est-il ouvert (tablette et mobile uniquement)
 * - onClose : fonction pour fermer le tiroir
 * - onLogout : fonction appelée au clic sur « Se déconnecter »
 */
function Sidebar({ navigationItems, userName, userRole, isOpen, onClose, onLogout }) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        id="dashboard-sidebar"
        aria-label="Navigation principale"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto bg-gradient-to-b from-brand-800 to-brand-700 text-white shadow-2xl transition-transform duration-200 lg:w-60 lg:translate-x-0 lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le menu"
          className="absolute right-3 top-3 rounded-lg p-2 text-white/90 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 lg:hidden"
        >
          <XmarkIcon className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="px-4 pt-6">
          <Logo orientation="vertical" size="sidebar" />
        </div>

        <nav aria-label="Pages de l'application" className="mt-7 flex-1 space-y-1.5 px-3">
          {navigationItems.map((item) => (
            <SidebarItem
              key={item.to}
              label={item.label}
              to={item.to}
              icon={item.icon}
              onNavigate={onClose}
            />
          ))}
        </nav>

        <div className="mt-6 px-4">
          <div className="border-t border-white/15 pt-4">
            <SidebarUserCard userName={userName} userRole={userRole} />

            <button
              type="button"
              onClick={onLogout}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-danger-500 px-4 py-2.5 text-sm font-semibold text-[#ff6b72] transition hover:bg-danger-500/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-danger-500/30"
            >
              <RightFromBracketIcon className="h-4 w-4" aria-hidden="true" />
              Se déconnecter
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-white/5 px-4 py-4 text-center">
            <TrophyIcon className="mx-auto h-6 w-6 text-amber-400" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold leading-snug">
              Grandir ensemble,
              <br />
              réussir ensemble !
            </p>
          </div>
        </div>

        <BrandWave className="mt-4 h-14 w-full shrink-0" />
      </aside>
    </>
  )
}

export default Sidebar
