import { BarsIcon, CalendarDaysIcon } from '../../icons'
import Avatar from '../common/Avatar'
import NotificationBell from '../notifications/NotificationBell'

/**
 * En-tête du Dashboard : bouton menu (tablette/mobile), titre de la page,
 * date du jour, cloche de rappels de cotisation (réels) et avatar de l'utilisateur.
 *
 * Props :
 * - title : titre affiché (message de bienvenue ou nom de la page)
 * - subtitle : phrase sous le titre (optionnelle, masquée sur mobile)
 * - dateLabel : date du jour en toutes lettres (écrans larges)
 * - compactDateLabel : date du jour courte (petits écrans)
 * - userInitials : initiales de l'utilisateur (avatar)
 * - onOpenMenu : fonction pour ouvrir la barre latérale (tablette/mobile)
 */
function DashboardHeader({
  title,
  subtitle,
  dateLabel,
  compactDateLabel,
  userInitials,
  onOpenMenu,
}) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Ouvrir le menu"
        aria-controls="dashboard-sidebar"
        className="rounded-lg p-2 text-ink transition hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30 lg:hidden"
      >
        <BarsIcon className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="text-base font-extrabold leading-tight tracking-tight text-ink sm:truncate sm:text-xl">
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 hidden truncate text-sm text-ink-soft sm:block">{subtitle}</p>}
        {/* Sur mobile la date passe sous le titre, faute de place dans la barre. */}
        <p className="mt-0.5 text-xs text-ink-soft sm:hidden">{compactDateLabel}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <p className="hidden items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink shadow-sm sm:flex">
          <CalendarDaysIcon className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
          <span className="hidden whitespace-nowrap md:inline">{dateLabel}</span>
          <span className="whitespace-nowrap md:hidden">{compactDateLabel}</span>
        </p>

        <NotificationBell />

        <Avatar initials={userInitials} tone="green" size="md" />
      </div>
    </header>
  )
}

export default DashboardHeader
