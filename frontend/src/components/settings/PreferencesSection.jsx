import { SlidersIcon } from '../../icons'
import { AMOUNT_FORMAT_OPTIONS } from '../../constants/settingsSettings'
import { THEME_OPTIONS } from '../../utils/settingsViewModel'
import FormSelectField from '../common/FormSelectField'
import ToggleSwitch from '../common/ToggleSwitch'
import SettingsInfoRow from './SettingsInfoRow'
import SettingsSection from './SettingsSection'

function PreferencesSection({ preferences, isSaving, onChange, currencyLabel, languageLabel }) {
  return (
    <SettingsSection
      icon={SlidersIcon}
      title="Mes préférences"
      badgeLabel="Personnelles"
      description="Enregistrées dans votre compte et appliquées immédiatement. Elles ne concernent que vous, pas l'autre associé."
      contentElement={
        <fieldset disabled={isSaving} aria-busy={isSaving} className="min-w-0 border-0 p-0">
          <dl className="divide-y divide-line rounded-xl border border-line px-4">
            <SettingsInfoRow label="Devise" value={currencyLabel} noteLabel="Une seule devise, non modifiable" />
            <SettingsInfoRow label="Langue" value={languageLabel} noteLabel="Seule langue disponible" />
          </dl>

          <div className="mt-4 space-y-4">
            <FormSelectField
              id="settings-theme"
              name="theme"
              label="Thème"
              value={preferences.theme}
              onChange={(event) => onChange({ theme: event.target.value })}
              options={THEME_OPTIONS}
            />
            <FormSelectField
              id="settings-amount-format"
              name="amountSeparator"
              label="Format d'affichage des montants"
              value={preferences.amountSeparator}
              onChange={(event) => onChange({ amountSeparator: event.target.value })}
              options={AMOUNT_FORMAT_OPTIONS}
            />
          </div>

          <div className="mt-2 divide-y divide-line">
            <ToggleSwitch
              id="settings-visual-notifications"
              label="Notifications visuelles"
              description="Affiche la pastille de la cloche et la bannière de rappel du Dashboard. Les erreurs restent toujours visibles."
              checked={preferences.visualNotificationsEnabled}
              onChange={(checked) => onChange({ visualNotificationsEnabled: checked })}
              disabled={isSaving}
            />
            <ToggleSwitch
              id="settings-contribution-reminders"
              label="Rappels de cotisation"
              description="Liste les cotisations à compléter (mois en cours et mois précédents incomplets). Aucune cotisation n'est modifiée."
              checked={preferences.contributionRemindersEnabled}
              onChange={(checked) => onChange({ contributionRemindersEnabled: checked })}
              disabled={isSaving}
            />
            <ToggleSwitch
              id="settings-email-notifications"
              label="Notifications par email"
              description="Non disponible : aucun envoi d'email n'est configuré."
              checked={false}
              onChange={() => {}}
              disabled
            />
          </div>
        </fieldset>
      }
    />
  )
}

export default PreferencesSection
