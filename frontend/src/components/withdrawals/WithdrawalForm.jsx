import { CalendarDaysIcon, WalletIcon } from '../../icons'
import useFormValidation from '../../hooks/useFormValidation'
import { MAX_REASON_LENGTH, validateWithdrawalForm } from '../../utils/withdrawalsViewModel'
import { formatMoney } from '../../utils/treasuryViewModel'
import AuthInput from '../auth/AuthInput'
import ActionButton from '../common/ActionButton'
import FormError from '../common/FormError'
import FormSelectField from '../common/FormSelectField'
import TextAreaField from '../common/TextAreaField'

function WithdrawalForm({ initialValues, context, partnerOptions, authorName, isEdit, submission, onSubmit, onCancel }) {
  const { values, errors, handleChange, handleBlur, validateAll } = useFormValidation({
    initialValues,
    validate: (formValues) => validateWithdrawalForm(formValues, context),
  })
  const isSubmitting = submission.status === 'submitting'
  const shown = (name) => errors[name] || submission.fieldErrors[name]
  const balance = context.availableBalance

  const handleSubmit = (event) => {
    event.preventDefault()
    if (isSubmitting || !validateAll()) return
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-busy={isSubmitting}>
      <div className="rounded-xl border border-line bg-surface p-3 text-sm">
        <p className="text-ink-soft">Trésorerie disponible{isEdit ? ' pour ce retrait' : ''}</p>
        <p className="text-lg font-extrabold text-ink">{balance === null ? 'Non disponible' : formatMoney(balance)}</p>
        <p className="mt-1 text-ink-soft">Enregistré par : <span className="font-semibold text-ink">{authorName || 'vous'}</span> (identifié par votre session)</p>
      </div>

      <FormSelectField id="wd-beneficiary" name="beneficiaryId" label="Bénéficiaire du retrait" value={values.beneficiaryId} onChange={handleChange} onBlur={handleBlur} options={partnerOptions} error={shown('beneficiaryId')} />
      <AuthInput id="wd-amount" name="amount" label="Montant (FCFA)" placeholder="Ex. 25 000" inputMode="numeric" icon={WalletIcon} value={values.amount} onChange={handleChange} onBlur={handleBlur} error={shown('amount')} autoComplete="off" />
      <AuthInput id="wd-date" name="withdrawalDate" type="date" label="Date du retrait" icon={CalendarDaysIcon} max={context.todayIso} value={values.withdrawalDate} onChange={handleChange} onBlur={handleBlur} error={shown('withdrawalDate')} />
      <TextAreaField id="wd-reason" name="reason" label="Motif (facultatif)" placeholder="Ex. Besoin personnel" maxLength={MAX_REASON_LENGTH} value={values.reason} onChange={handleChange} onBlur={handleBlur} error={shown('reason')} />

      {submission.status === 'error' && <FormError variant="banner" message={submission.message} />}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <ActionButton label="Annuler" variant="secondary" onClick={onCancel} disabled={isSubmitting} />
        <ActionButton label={isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Enregistrer le retrait'} type="submit" disabled={isSubmitting} />
      </div>
    </form>
  )
}

export default WithdrawalForm
