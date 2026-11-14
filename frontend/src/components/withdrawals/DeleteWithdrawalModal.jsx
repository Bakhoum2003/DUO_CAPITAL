import { TrashIcon } from '../../icons'
import { useState } from 'react'
import { MAX_REASON_LENGTH } from '../../utils/withdrawalsViewModel'
import { formatMoney } from '../../utils/treasuryViewModel'
import ActionButton from '../common/ActionButton'
import FormError from '../common/FormError'
import FormModal from '../common/FormModal'
import TextAreaField from '../common/TextAreaField'

/**
 * Confirmation d'une suppression LOGIQUE (le retrait n'est plus compté, mais reste conservé dans l'historique).
 * Props : withdrawal, submission { status, message }, onConfirm(motif), onClose.
 */
function DeleteWithdrawalModal({ withdrawal, submission, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const isSubmitting = submission.status === 'submitting'
  const tooLong = reason.trim().length > MAX_REASON_LENGTH
  const form = (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!isSubmitting && !tooLong) onConfirm(reason)
      }}
    >
      <p className="text-sm text-ink">
        Retrait de <strong>{formatMoney(withdrawal.amount)}</strong> au bénéfice de <strong>{withdrawal.beneficiary.name}</strong>. Il ne sera plus compté dans la trésorerie ; sa trace reste conservée.
      </p>
      <TextAreaField id="wd-delete-reason" name="reason" label="Motif de la suppression (facultatif)" placeholder="Ex. Erreur de saisie" maxLength={MAX_REASON_LENGTH} value={reason} onChange={(event) => setReason(event.target.value)} error={tooLong ? `Le motif est limité à ${MAX_REASON_LENGTH} caractères.` : ''} />
      {submission.status === 'error' && <FormError variant="banner" message={submission.message} />}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <ActionButton label="Annuler" variant="secondary" onClick={onClose} disabled={isSubmitting} />
        <ActionButton label={isSubmitting ? 'Suppression…' : 'Supprimer le retrait'} icon={TrashIcon} variant="danger" type="submit" disabled={isSubmitting || tooLong} />
      </div>
    </form>
  )
  return <FormModal idPrefix="withdrawal-delete" title="Supprimer ce retrait ?" description="Suppression logique : aucune donnée n'est effacée définitivement." onClose={onClose} formElement={form} />
}

export default DeleteWithdrawalModal
