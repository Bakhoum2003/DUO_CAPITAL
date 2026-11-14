import { CircleInfoIcon } from '../../icons'
import TextAreaField from '../common/TextAreaField'
import SettingsFormActions from './SettingsFormActions'
import SettingsInfoRow from './SettingsInfoRow'
import SettingsSection from './SettingsSection'

/**
 * Informations générales : identité du fonds (lecture seule) et description / informations du projet (modifiables).
 * L'enregistrement est demandé à l'utilisateur dans une fenêtre de confirmation avant d'être appliqué.
 *
 * Props :
 * - appName, slogan, currencyLabel : identité de l'application (lecture seule)
 * - values : { description, projectInfo } du brouillon
 * - errors : { description, projectInfo } messages d'erreur
 * - isDirty : modifications non enregistrées
 * - isSaving : enregistrement en cours
 * - updatedLabel : dernière modification (« 12 nov. 2026 à 10:30 par Cheikh Sow »), vide si jamais modifié
 * - onFieldChange : fonction (nom, valeur) appelée à chaque saisie
 * - onSubmit : fonction appelée à la soumission du formulaire (validation puis confirmation)
 * - onCancel : fonction appelée au clic sur « Annuler »
 * - descriptionMaxLength, projectInfoMaxLength : longueurs maximales
 */
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
