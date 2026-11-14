import { ShieldHalvedIcon } from '../../icons'
import ActionButton from '../common/ActionButton'
import FormError from '../common/FormError'
import SettingsInfoRow from './SettingsInfoRow'
import SettingsSection from './SettingsSection'

/**
 * Sécurité du compte connecté, lue sur le serveur (GET /api/v1/settings/security).
 * Aucun jeton, mot de passe ni secret n'est affiché ; aucune action de changement de mot de passe ici.
 *
 * Props :
 * - status : 'loading' | 'ready' | 'error'
 * - view : données adaptées (voir toSecurityView), null tant que non chargées
 * - errorMessage : message d'erreur lisible
 * - onRetry : fonction appelée au clic sur « Réessayer »
 */
function SecuritySection({ status, view, errorMessage, onRetry }) {
  return (
    <SettingsSection
      icon={ShieldHalvedIcon}
      title="Sécurité"
      badgeLabel="Lecture seule"
      contentElement={
        <>
          {status === 'loading' && <p role="status" className="text-sm text-ink-soft">Chargement des informations de sécurité…</p>}

          {status === 'error' && (
            <div className="space-y-3">
              <FormError variant="banner" message={errorMessage} />
              <ActionButton label="Réessayer" variant="secondary" size="sm" onClick={onRetry} />
            </div>
          )}

          {status === 'ready' && view && (
            <>
              <dl className="divide-y divide-line rounded-xl border border-line px-4">
                <SettingsInfoRow label="Compte connecté" value={view.account.name} noteLabel={view.account.email} />
                <SettingsInfoRow label="État du compte" value={view.account.isActive ? 'Actif' : 'Inactif'} />
                <SettingsInfoRow
                  label="Authentification"
                  value="Email et mot de passe"
                  noteLabel="Session protégée par des cookies HttpOnly, non lisibles par l'application."
                />
                <SettingsInfoRow
                  label="Mot de passe"
                  value={view.account.passwordProtected ? 'Protégé' : 'Non défini'}
                  noteLabel={view.account.passwordChangedAt ? `Dernière modification : ${view.account.passwordChangedAt}` : undefined}
                />
                <SettingsInfoRow label="Dernière connexion" value={view.account.lastLoginAt ?? '—'} />
                <SettingsInfoRow
                  label="Durée des sessions"
                  value={view.refreshTokenDays ? `${view.refreshTokenDays} jours` : '—'}
                  noteLabel="Renouvelée automatiquement ; terminée par la déconnexion."
                />
                <SettingsInfoRow label="Sessions actives" value={String(view.activeCount)} />
              </dl>

              {view.account.mustChangePassword && (
                <p className="mt-3 rounded-xl bg-orange-50 px-4 py-3 text-sm text-ink">
                  Votre mot de passe provisoire doit être changé.
                </p>
              )}

              {view.sessions.length > 0 && (
                <ul aria-label="Sessions actives" className="mt-3 space-y-2">
                  {view.sessions.map((session) => (
                    <li key={session.key} className="rounded-xl border border-line px-4 py-3 text-sm">
                      <p className="font-semibold text-ink">
                        {session.device}
                        {session.isCurrent && (
                          <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">Cette session</span>
                        )}
                      </p>
                      <p className="text-xs text-ink-soft">
                        Ouverte : {session.createdAt} · Dernière activité : {session.lastUsedAt} · Expire : {session.expiresAt}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      }
    />
  )
}

export default SecuritySection
