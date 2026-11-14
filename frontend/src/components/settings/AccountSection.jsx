import { UserIcon } from '../../icons'
import SettingsSection from './SettingsSection'

/**
 * Mon compte : identité de l'utilisateur connecté (lecture seule).
 * Les informations viennent du serveur (utilisateur authentifié).
 *
 * Props :
 * - fullName, initials, role : informations de l'utilisateur
 */
function AccountSection({ fullName, initials, role }) {
  return (
    <SettingsSection
      icon={UserIcon}
      title="Mon compte"
      badgeLabel="Lecture seule"
      contentElement={
        <>
          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xl font-extrabold text-white">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold text-ink">{fullName}</p>
              <p className="text-sm text-ink-soft">{role}</p>
            </div>
          </div>
          <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm text-ink-soft">
            La modification du profil sera disponible prochainement.
          </p>
        </>
      }
    />
  )
}

export default AccountSection
