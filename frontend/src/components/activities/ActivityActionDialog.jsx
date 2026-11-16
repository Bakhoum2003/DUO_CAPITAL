import { useRef, useState } from 'react'
import useModalBehavior from '../../hooks/useModalBehavior'
import useUnsavedChanges from '../../hooks/useUnsavedChanges'
import { ACTION_META, MAX_REASON_LENGTH, validateActionInput } from '../../utils/activitiesViewModel'
import AuthInput from '../auth/AuthInput'
import ActionButton from '../common/ActionButton'
import FormError from '../common/FormError'
import TextAreaField from '../common/TextAreaField'

function ActivityActionDialog({ action, activity, todayIso, submission, onConfirm, onClose }) {
  const meta = ACTION_META[action]
  const dialogRef = useRef(null)
  useModalBehavior({ dialogRef, onClose })
  const [input, setInput] = useState({ endDate: todayIso, reason: '' })
  const [inputError, setInputError] = useState('')
  useUnsavedChanges(input.reason.trim() !== '' || input.endDate !== todayIso)
  const isSubmitting = submission.status === 'submitting'

  const handleConfirm = () => {
    if (isSubmitting) return
    const error = validateActionInput(action, input, { startDate: activity.startDate, todayIso })
    setInputError(error ?? '')
    if (!error) onConfirm(input)
  }
  const change = (name) => (event) => {
    setInput((previous) => ({ ...previous, [name]: event.target.value }))
    setInputError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={isSubmitting ? undefined : onClose} aria-hidden="true" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="activity-action-title" aria-describedby="activity-action-description" className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <h2 id="activity-action-title" className="text-xl font-extrabold text-ink">{meta.title}</h2>
        <p className="mt-1 text-sm font-semibold text-ink">{activity.name}</p>
        <p id="activity-action-description" className="mt-2 text-sm text-ink-soft">{meta.description}</p>

        {meta.kind === 'complete' && (
          <div className="mt-4">
            <AuthInput id="action-end-date" name="endDate" type="date" label="Date de fin" max={todayIso} value={input.endDate} onChange={change('endDate')} error={inputError} disabled={isSubmitting} />
          </div>
        )}
        {meta.kind === 'reopen' && (
          <div className="mt-4">
            <TextAreaField id="action-reason" name="reason" label="Motif de la réouverture *" placeholder="Ex. Nouveau lot de marchandises" maxLength={MAX_REASON_LENGTH} value={input.reason} onChange={change('reason')} error={inputError} />
          </div>
        )}

        {submission.status === 'error' && (
          <div className="mt-4">
            <FormError variant="banner" message={submission.message} />
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <ActionButton label="Annuler" variant="secondary" onClick={onClose} disabled={isSubmitting} />
          <ActionButton label={isSubmitting ? 'En cours…' : meta.confirmLabel} variant={meta.variant} onClick={handleConfirm} disabled={isSubmitting} />
        </div>
      </div>
    </div>
  )
}

export default ActivityActionDialog
