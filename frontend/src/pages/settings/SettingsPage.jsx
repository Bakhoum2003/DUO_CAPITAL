import { FloppyDiskIcon, RotateLeftIcon } from '../../icons'
import { useCallback, useState } from 'react'
import ActionButton from '../../components/common/ActionButton'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import FormError from '../../components/common/FormError'
import PageHeader from '../../components/common/PageHeader'
import AboutSection from '../../components/settings/AboutSection'
import AccountSection from '../../components/settings/AccountSection'
import AssociatesSection from '../../components/settings/AssociatesSection'
import GeneralInfoSection from '../../components/settings/GeneralInfoSection'
import ObjectivesSection from '../../components/settings/ObjectivesSection'
import PreferencesSection from '../../components/settings/PreferencesSection'
import ResetSection from '../../components/settings/ResetSection'
import SecuritySection from '../../components/settings/SecuritySection'
import { APP_IDENTITY, ASSOCIATE_ROLE_LABEL } from '../../constants/settingsSettings'
import useAuth from '../../hooks/useAuth'
import useDraftForm from '../../hooks/useDraftForm'
import useFeedbackMessage from '../../hooks/useFeedbackMessage'
import usePreferences from '../../hooks/usePreferences'
import useSecurity from '../../hooks/useSecurity'
import useSettings from '../../hooks/useSettings'
import { formatDateTime, validateGeneralValues } from '../../utils/settingsViewModel'
import { getParticipationPercent, validateAssociates, validateObjectives } from '../../utils/settingsValidators'

const EMPTY_VALUES = { description: '', projectInfo: '' }
const AVATAR_TONES = ['green', 'red']

function toInitials(name) {
  return String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0].toUpperCase())
    .join('')
}

/**
 * Page « Paramètres », branchée sur l'API (GET/PUT /api/v1/settings, /settings/preferences, /settings/security).
 * - Paramètres COMMUNS (description, informations du projet) : partagés par les deux associés, enregistrés après
 *   confirmation, avec contrôle de version (HTTP 409 si l'autre associé a modifié entre-temps).
 * - Préférences PERSONNELLES : propres à l'associé connecté, appliquées immédiatement.
 * - Associés, objectifs, devise et identité : lecture seule, fournis par le serveur.
 */
function SettingsPage() {
  const { user } = useAuth()
  const settings = useSettings()
  const prefs = usePreferences()
  const security = useSecurity()
  const [successMessage, setSuccessMessage] = useFeedbackMessage()
  const [errorMessage, setErrorMessage] = useState('')
  const [pendingGeneral, setPendingGeneral] = useState(null)
  const [isResetOpen, setIsResetOpen] = useState(false)

  const { view } = settings
  const validateGeneral = useCallback((values) => validateGeneralValues(values, view?.limits), [view])
  const generalForm = useDraftForm({ savedValues: view?.values ?? EMPTY_VALUES, validate: validateGeneral })

  const fail = (message) => {
    setSuccessMessage('')
    setErrorMessage(message)
  }

  const handleGeneralSubmit = () => {
    const values = generalForm.submit()
    if (values) setPendingGeneral(values)
  }

  const handleGeneralConfirm = async () => {
    if (settings.isSaving || !pendingGeneral) return
    const values = pendingGeneral
    setPendingGeneral(null)
    const result = await settings.save(values)
    if (result.ok) {
      setErrorMessage('')
      setSuccessMessage(result.unchanged ? 'Aucune modification à enregistrer.' : 'Informations générales enregistrées pour les deux associés.')
    } else {
      fail(result.message)
    }
  }

  const handlePreferencesChange = async (changes) => {
    const result = await prefs.update(changes)
    if (result.ok) setErrorMessage('')
    else fail(result.message)
  }

  const handleResetConfirm = async () => {
    setIsResetOpen(false)
    const result = await prefs.reset()
    if (result.ok) setErrorMessage('')
    else fail(result.message)
  }

  const partners = view?.partners ?? []
  const associates = partners.map((partner, index) => ({
    id: partner.id,
    name: partner.name,
    initials: toInitials(partner.name),
    avatarTone: AVATAR_TONES[index % AVATAR_TONES.length],
  }))
  const monthlyTarget = view?.objectives?.monthlyPerPartner ?? 0
  const collectiveTarget = view?.objectives?.monthlyCollective ?? 0
  const objectives = validateObjectives({ individual: monthlyTarget, collective: collectiveTarget, associateCount: partners.length })
  const updatedLabel = view?.updatedAt
    ? `Dernière modification : ${formatDateTime(view.updatedAt)}${view.updatedByName ? ` par ${view.updatedByName}` : ''}.`
    : ''

  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres" description="Consultez la configuration de DUO CAPITAL et ajustez vos préférences." />

      <FormError message={successMessage || prefs.notice} variant="banner" tone="info" />
      <FormError message={errorMessage} variant="banner" />
      {prefs.status === 'error' && (
        <div className="space-y-2">
          <FormError message={`Vos préférences n'ont pas pu être chargées. ${prefs.errorMessage}`} variant="banner" />
          <ActionButton label="Réessayer" variant="secondary" size="sm" onClick={prefs.reload} />
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <AccountSection fullName={user.fullName} initials={user.initials} role={user.role} />

          {settings.status === 'loading' && !view && (
            <p role="status" className="rounded-2xl border border-line bg-white px-5 py-8 text-center text-sm text-ink-soft">
              Chargement des paramètres communs…
            </p>
          )}
          {settings.status === 'error' && !view && (
            <div className="space-y-3 rounded-2xl border border-line bg-white p-5">
              <FormError variant="banner" message={settings.errorMessage} />
              <ActionButton label="Réessayer" variant="secondary" size="sm" onClick={settings.refresh} />
            </div>
          )}

          {view && (
            <>
              {settings.errorMessage && <FormError variant="banner" message={settings.errorMessage} />}
              <GeneralInfoSection
                appName={view.identity?.name ?? APP_IDENTITY.name}
                slogan={view.identity?.slogan ?? APP_IDENTITY.slogan}
                currencyLabel={view.identity?.currencyLabel ?? APP_IDENTITY.currencyLabel}
                values={generalForm.values}
                errors={generalForm.errors}
                isDirty={generalForm.isDirty}
                isSaving={settings.isSaving}
                updatedLabel={updatedLabel}
                onFieldChange={generalForm.setField}
                onSubmit={handleGeneralSubmit}
                onCancel={generalForm.cancel}
                descriptionMaxLength={view.limits.descriptionMax}
                projectInfoMaxLength={view.limits.projectInfoMax}
              />
              <AssociatesSection
                associates={associates}
                roleLabel={ASSOCIATE_ROLE_LABEL}
                participationPercent={getParticipationPercent(partners.length)}
                monthlyTarget={monthlyTarget}
                errorMessages={validateAssociates(associates)}
              />
              <ObjectivesSection
                individualTarget={monthlyTarget}
                collectiveTarget={collectiveTarget}
                associateCount={partners.length}
                isConsistent={objectives.isValid}
              />
            </>
          )}
        </div>

        <div className="space-y-6">
          <PreferencesSection
            preferences={prefs.preferences}
            isSaving={prefs.isSaving}
            onChange={handlePreferencesChange}
            currencyLabel={view?.identity?.currencyLabel ?? APP_IDENTITY.currencyLabel}
            languageLabel={APP_IDENTITY.language}
          />
          <SecuritySection status={security.status} view={security.view} errorMessage={security.errorMessage} onRetry={security.refresh} />
          <AboutSection
            appName={APP_IDENTITY.name}
            version={APP_IDENTITY.version}
            slogan={APP_IDENTITY.slogan}
            aboutText={APP_IDENTITY.aboutText}
          />
          <ResetSection onReset={() => setIsResetOpen(true)} isDisabled={prefs.isSaving} />
        </div>
      </div>

      {pendingGeneral && (
        <ConfirmDialog
          idPrefix="settings-general-confirm"
          title="Enregistrer ces informations ?"
          description="La description du fonds et les informations du projet seront remplacées pour les deux associés."
          confirmLabel="Enregistrer"
          icon={FloppyDiskIcon}
          confirmVariant="primary"
          onConfirm={handleGeneralConfirm}
          onClose={() => setPendingGeneral(null)}
        />
      )}

      {isResetOpen && (
        <ConfirmDialog
          idPrefix="settings-reset-confirm"
          title="Réinitialiser mes préférences ?"
          description="Vos préférences personnelles (thème, format des montants, notifications) reviendront à leurs valeurs par défaut. Les paramètres communs, l'autre associé et vos données financières ne seront pas modifiés."
          confirmLabel="Réinitialiser"
          icon={RotateLeftIcon}
          onConfirm={handleResetConfirm}
          onClose={() => setIsResetOpen(false)}
        />
      )}
    </div>
  )
}

export default SettingsPage
