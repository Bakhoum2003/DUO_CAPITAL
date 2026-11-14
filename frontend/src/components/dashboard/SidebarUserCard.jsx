import { UserIcon } from '../../icons'

/**
 * Bloc utilisateur en bas de la barre latérale (avatar, nom, rôle).
 *
 * Props :
 * - userName : nom complet de l'utilisateur connecté
 * - userRole : rôle affiché sous le nom (ex. « Administrateur »)
 */
function SidebarUserCard({ userName, userRole }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ffffff] text-[#0b6a2e]">
        <UserIcon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-white">{userName}</p>
        <p className="flex items-center gap-1.5 text-xs text-white/80">
          <span className="h-2 w-2 rounded-full bg-brand-400" aria-hidden="true" />
          {userRole}
        </p>
      </div>
    </div>
  )
}

export default SidebarUserCard
