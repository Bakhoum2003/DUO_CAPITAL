import { CalendarDaysIcon, WalletIcon } from '../../icons'
import useFormValidation from '../../hooks/useFormValidation'
import { MAX_NOTE_LENGTH, validateRecordForm } from '../../utils/contributionsViewModel'
import AuthInput from '../auth/AuthInput'
import ActionButton from '../common/ActionButton'
import FormError from '../common/FormError'
import FormSelectField from '../common/FormSelectField'
import TextAreaField from '../common/TextAreaField'

/**
 * Formulaire d'enregistrement d'une cotisation réelle. Rien n'est enregistré avant la confirmation du serveur ;
 * le bouton est désactivé pendant l'envoi (aucune double soumission).
 *
 * Props : initialValues, context { todayIso, fundStartPeriod, partnerIds }, partnerOptions, periodOptions,
 * submission { status, message, fieldErrors, needsDuplicateConfirmation }, onSubmit(values, { confirmDuplicate }), onCancel.
 */
function RecordContributionForm({ initialValues, context, partnerOptions, periodOptions, submission, onSubmit, onCancel }) {
  const { values, errors, handleChange, handleBlur, validateAll } = useFormValidation({
    initialValues,
    validate: (formValues) => validateRecordForm(formValues, context),
  })
  const isSubmitting = submission.status === 'submitting'
  const shown = (name) => errors[name] || submission.fieldErrors[name]

  const handleSubmit = (event) => {
    event.preventDefault()
    if (isSubmitting || !validateAll()) return
    onSubmit(values, { confirmDuplicate: false })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-busy={isSubmitting}>
      <FormSelectField id="rc-partner" name="partnerId" label="Associé concerné" value={values.partnerId} onChange={handleChange} onBlur={handleBlur} options={partnerOptions} error={shown('partnerId')} />
      <AuthInput id="rc-amount" name="amount" label="Montant (FCFA)" placeholder="Ex. 15 000" inputMode="numeric" icon={WalletIcon} value={values.amount} onChange={handleChange} onBlur={handleBlur} error={shown('amount')} autoComplete="off" />
      <AuthInput id="rc-date" name="contributionDate" type="date" label="Date effective du versement" icon={CalendarDaysIcon} max={context.todayIso} value={values.contributionDate} onChange={handleChange} onBlur={handleBlur} error={shown('contributionDate')} />
      <FormSelectField id="rc-period" name="period" label="Mois concerné" value={values.period} onChange={handleChange} onBlur={handleBlur} options={periodOptions} error={shown('period')} icon={CalendarDaysIcon} />
      <TextAreaField id="rc-note" name="note" label="Note (facultative)" placeholder="Ex. Virement mobile" maxLength={MAX_NOTE_LENGTH} value={values.note} onChange={handleChange} onBlur={handleBlur} error={shown('note')} />

      {submission.status === 'error' && <FormError variant="banner" message={submission.message} />}

      {submission.needsDuplicateConfirmation && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-ink">
          <p className="mb-2 font-semibold">Un versement identique vient d'être enregistré. S'agit-il bien d'un second versement ?</p>
          <ActionButton label="Oui, enregistrer ce second versement" variant="secondary" size="sm" disabled={isSubmitting} onClick={() => validateAll() && onSubmit(values, { confirmDuplicate: true })} />
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <ActionButton label="Annuler" variant="secondary" onClick={onCancel} disabled={isSubmitting} />
        <ActionButton label={isSubmitting ? 'Enregistrement…' : 'Enregistrer'} type="submit" disabled={isSubmitting} />
      </div>
    </form>
  )
}

export default RecordContributionForm
