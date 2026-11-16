import { NavLink } from 'react-router-dom'
import { BarsIcon } from '../../icons'

const ITEM_CLASS =
  'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 text-[0.65rem] font-semibold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/50 min-[380px]:text-[0.7rem]'

function itemTone(isActive) {
  return isActive ? 'text-brand-700' : 'text-ink-soft active:bg-surface'
}

function ActiveMark({ isActive }) {
  if (!isActive) return null
  return <span className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-brand-500" aria-hidden="true" />
}

/**
 * Barre de navigation fixe en bas de l'écran, réservée aux petits écrans (masquée dès `md`).
 * Elle montre les rubriques principales ; le bouton « Menu » ouvre le tiroir existant, qui liste toutes
 * les rubriques et la déconnexion. La zone de sécurité du téléphone est ajoutée sous la barre.
 */
function MobileBottomNav({ primaryItems, isMenuActive, isMenuOpen, onOpenMenu }) {
  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] shadow-[0_-4px_16px_rgb(0_0_0/0.06)] md:hidden"
    >
      <div className="flex h-14">
        {primaryItems.map(({ to, label, mobileLabel, icon: Icon }) => (
          <NavLink key={to} to={to} aria-label={label} className={({ isActive }) => `${ITEM_CLASS} ${itemTone(isActive)}`}>
            {({ isActive }) => (
              <>
                <ActiveMark isActive={isActive} />
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="max-w-full truncate">{mobileLabel ?? label}</span>
              </>
            )}
          </NavLink>
        ))}

        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Ouvrir le menu complet"
          aria-controls="dashboard-sidebar"
          aria-expanded={isMenuOpen}
          className={`${ITEM_CLASS} ${itemTone(isMenuActive)}`}
        >
          <ActiveMark isActive={isMenuActive} />
          <BarsIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  )
}

export default MobileBottomNav
