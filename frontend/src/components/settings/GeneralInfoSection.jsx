import { CircleInfoIcon } from '../../icons'
import TextAreaField from '../common/TextAreaField'
import SettingsFormActions from './SettingsFormActions'
import SettingsInfoRow from './SettingsInfoRow'
import SettingsSection from './SettingsSection'

function GeneralInfoSection({
  appName,
  slogan,
  currencyLabel,
  values,
  errors,
  isDirty,
  isSaving,
  updatedLabel,
  onFieldChange,
  onSubmit,
  onCancel,
  descriptionMaxLength,
  projectInfoMaxLength,
}) {
  return (
    <SettingsSection
      icon={CircleInfoIcon}
      title="Informations générales"
      description="Communes aux deux associés : ce que l'un enregistre, l'autre le voit. Le nom, le slogan et la devise ne se modifient pas ici."
      contentElement={
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <dl className="divide-y divide-line rounded-xl border border-line px-4">
            <SettingsInfoRow label="Nom de l'application" value={appName} />
            <SettingsInfoRow label="Slogan" value={slogan} />
            <SettingsInfoRow label="Devise" value={currencyLabel} />
          </dl>

          <div className="mt-4 space-y-4">
            <TextAreaField
              id="settings-description"
              name="description"
              label="Description du fonds"
              value={values.description}
              onChange={(event) => onFieldChange('description', event.target.value)}
              error={errors.description}
              maxLength={descriptionMaxLength}
            />
            <TextAreaField
              id="settings-project-info"
              name="projectInfo"
              label="Informations du projet"
              placeholder="Objectif, contexte, règles du fonds…"
              value={values.projectInfo}
              onChange={(event) => onFieldChange('projectInfo', event.target.value)}
              error={errors.projectInfo}
              maxLength={projectInfoMaxLength}
            />
          </div>

          {updatedLabel && <p className="mt-3 text-xs text-ink-soft">{updatedLabel}</p>}
          <SettingsFormActions isDirty={isDirty} isSaving={isSaving} onCancel={onCancel} />
        </form>
      }
    />
  )
}

export default GeneralInfoSection
