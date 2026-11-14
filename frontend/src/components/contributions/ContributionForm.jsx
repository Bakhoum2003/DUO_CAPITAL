import { CalendarDaysIcon, WalletIcon } from '../../icons'
import { ASSOCIATES } from '../../constants/associates'
import { MAX_DESCRIPTION_LENGTH } from '../../constants/contributionSettings'
import useFormValidation from '../../hooks/useFormValidation'
import { parseAmount, validateContributionForm } from '../../utils/contributionValidators'
import AssociateSelector from '../auth/AssociateSelector'
import AuthInput from '../auth/AuthInput'
import ActionButton from '../common/ActionButton'
import TextAreaField from '../common/TextAreaField'

const ASSOCIATE_IDS = ASSOCIATES.map((associate) => associate.value)

/**
 * Formulaire d'ajout ou de modification d'une cotisation (associé, montant, date, description).
 * Les erreurs s'affichent sous chaque champ ; rien n'est enregistré tant que le formulaire est invalide.
 *
 * Props :
 * - idPrefix : préfixe des identifiants des champs (évite les doublons dans la page)
 * - initialValues : { associateId, amount, date, description } (texte pour le montant)
 * - todayIso : date du jour « AAAA-MM-JJ » (une cotisation ne peut pas être datée du futur)
 * - submitLabel : texte du bouton d'enregistrement
 * - onSubmit : fonction appelée avec { associateId, amount (nombre), date, description } quand tout est valide
 * - onCancel : fonction appelée au clic sur « Annuler »
 */
function ContributionForm({ idPrefix, initialValues, todayIso, submitLabel, onSubmit, onCancel }) {
  const { values, errors, handleChange, handleBlur, setFieldValue, validateAll } = useFormValidation({
    initialValues,
    validate: (formValues) => validateContributionForm(formValues, todayIso, ASSOCIATE_IDS),
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!validateAll()) return

    onSubmit({
      associateId: values.associateId,
      amount: parseAmount(values.amount),
      date: values.date,
      description: values.description.trim(),
    })
  }

  const hasErrors = Object.values(errors).some(Boolean)

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AssociateSelector
        label="Associé concerné"
        name={`${idPrefix}-associate`}
        options={ASSOCIATES}
        selectedValue={values.associateId}
        onChange={(value) => setFieldValue('associateId', value)}
        error={errors.associateId}
      />

      <AuthInput
        id={`${idPrefix}-amount`}
        name="amount"
        label="Montant (FCFA)"
        placeholder="Ex. 15 000"
        inputMode="numeric"
        icon={WalletIcon}
        value={values.amount}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.amount}
        autoComplete="off"
      />

      <AuthInput
        id={`${idPrefix}-date`}
        name="date"
        type="date"
        label="Date de la cotisation"
        icon={CalendarDaysIcon}
        max={todayIso}
        value={values.date}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.date}
      />

      <TextAreaField
        id={`${idPrefix}-description`}
        name="description"
        label="Description (facultative)"
        placeholder="Ex. Cotisation mensuelle"
        maxLength={MAX_DESCRIPTION_LENGTH}
        value={values.description}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.description}
      />

      {hasErrors && (
        <p role="alert" className="text-sm font-medium text-danger-600">
          Corrigez les champs signalés en rouge avant d'enregistrer.
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <ActionButton label="Annuler" variant="secondary" onClick={onCancel} />
        <ActionButton label={submitLabel} type="submit" />
      </div>
    </form>
  )
}

export default ContributionForm
