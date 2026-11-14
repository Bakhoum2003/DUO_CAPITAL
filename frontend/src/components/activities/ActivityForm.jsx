import { CalendarDaysIcon, FileLinesIcon, TagIcon } from '../../icons'
import useFormValidation from '../../hooks/useFormValidation'
import { MAX_DESCRIPTION_LENGTH, validateActivityForm } from '../../utils/activitiesViewModel'
import AuthInput from '../auth/AuthInput'
import ActionButton from '../common/ActionButton'
import FormError from '../common/FormError'
import TextAreaField from '../common/TextAreaField'

/**
 * Formulaire de création / modification d'une activité. Rien n'est enregistré avant la confirmation du serveur ;
 * le bouton est désactivé pendant l'envoi (aucune double soumission). Les erreurs du serveur s'affichent sous les champs.
 * Le statut, l'auteur et les montants ne sont jamais modifiables ici.
 *
 * Props : initialValues, mode ('create' | 'edit'), showEndDate (activité terminée), todayIso, submission { status, message, fieldErrors },
 * onSubmit(values), onCancel.
 */
function ActivityForm({ initialValues, mode, showEndDate = false, todayIso, submission, onSubmit, onCancel }) {
  const { values, errors, handleChange, handleBlur, validateAll } = useFormValidation({
    initialValues,
    validate: (formValues) => validateActivityForm(formValues, { requireEndDate: showEndDate, showEndDate }),
  })
  const isSubmitting = submission.status === 'submitting'
  const shown = (name) => errors[name] || submission.fieldErrors[name]

  const handleSubmit = (event) => {
    event.preventDefault()
    if (isSubmitting || !validateAll()) return
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-busy={isSubmitting}>
      <AuthInput id="activity-name" name="name" label="Nom de l'activité *" placeholder="Ex. Vente de pagnes" icon={TagIcon} value={values.name} onChange={handleChange} onBlur={handleBlur} error={shown('name')} autoComplete="off" disabled={isSubmitting} />
      <TextAreaField id="activity-description" name="description" label="Description" placeholder="Décrivez brièvement l'activité" maxLength={MAX_DESCRIPTION_LENGTH} value={values.description} onChange={handleChange} onBlur={handleBlur} error={shown('description')} />
      <AuthInput id="activity-category" name="category" label="Catégorie" placeholder="Ex. Textile" icon={FileLinesIcon} value={values.category} onChange={handleChange} onBlur={handleBlur} error={shown('category')} autoComplete="off" disabled={isSubmitting} />
      <AuthInput id="activity-start" name="startDate" type="date" label="Date de démarrage *" icon={CalendarDaysIcon} value={values.startDate} onChange={handleChange} onBlur={handleBlur} error={shown('startDate')} disabled={isSubmitting} />
      {showEndDate && (
        <AuthInput id="activity-end" name="endDate" type="date" label="Date de fin *" icon={CalendarDaysIcon} max={todayIso} value={values.endDate} onChange={handleChange} onBlur={handleBlur} error={shown('endDate')} disabled={isSubmitting} />
      )}

      {submission.status === 'error' && <FormError variant="banner" message={submission.message} />}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <ActionButton label="Annuler" variant="secondary" onClick={onCancel} disabled={isSubmitting} />
        <ActionButton label={isSubmitting ? 'Enregistrement…' : mode === 'create' ? 'Créer l’activité' : 'Enregistrer'} type="submit" disabled={isSubmitting} />
      </div>
    </form>
  )
}

export default ActivityForm
