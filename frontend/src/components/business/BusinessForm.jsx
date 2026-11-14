import { CalendarDaysIcon, FlagIcon, StoreIcon, TagIcon, UserIcon, WalletIcon } from '../../icons'
import {
  BUSINESS_ASSOCIATES,
  BUSINESS_CATEGORIES,
  BUSINESS_STATUS_OPTIONS,
  MAX_BUSINESS_DESCRIPTION_LENGTH,
} from '../../constants/businessSettings'
import useFormValidation from '../../hooks/useFormValidation'
import { validateBusinessForm } from '../../utils/businessValidators'
import { parseAmount } from '../../utils/contributionValidators'
import AuthInput from '../auth/AuthInput'
import ActionButton from '../common/ActionButton'
import FormSelectField from '../common/FormSelectField'
import TextAreaField from '../common/TextAreaField'

const CATEGORY_OPTIONS = [
  { value: '', label: 'Choisir une catégorie' },
  ...BUSINESS_CATEGORIES.map((category) => ({ value: category.value, label: category.label })),
]
const RESPONSIBLE_OPTIONS = [
  { value: '', label: 'Non précisé' },
  ...BUSINESS_ASSOCIATES.map((associate) => ({ value: associate.id, label: associate.name })),
]
const CATEGORY_VALUES = BUSINESS_CATEGORIES.map((category) => category.value)
const STATUS_VALUES = BUSINESS_STATUS_OPTIONS.map((status) => status.value)
const ASSOCIATE_IDS = BUSINESS_ASSOCIATES.map((associate) => associate.id)

/**
 * Formulaire d'ajout ou de modification d'un business.
 * Rien n'est enregistré tant que le formulaire est invalide.
 *
 * Props :
 * - idPrefix : préfixe des identifiants des champs
 * - initialValues : { name, category, description, launchDate, initialInvestment (texte), responsibleId, status }
 * - todayIso : date du jour « AAAA-MM-JJ »
 * - otherBusinessNames : noms des autres business (pas de doublon)
 * - earliestOperationDate : date de la 1re opération du business modifié (« » pour un ajout)
 * - submitLabel : texte du bouton d'enregistrement
 * - onSubmit : fonction appelée avec les valeurs validées (investissement initial en nombre)
 * - onCancel : fonction appelée au clic sur « Annuler »
 */
function BusinessForm({
  idPrefix,
  initialValues,
  todayIso,
  otherBusinessNames,
  earliestOperationDate,
  submitLabel,
  onSubmit,
  onCancel,
}) {
  const { values, errors, handleChange, handleBlur, validateAll } = useFormValidation({
    initialValues,
    validate: (formValues) =>
      validateBusinessForm(formValues, {
        todayIso,
        categoryValues: CATEGORY_VALUES,
        statusValues: STATUS_VALUES,
        associateIds: ASSOCIATE_IDS,
        otherBusinessNames,
        earliestOperationDate,
      }),
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!validateAll()) return

    onSubmit({
      name: values.name.trim(),
      category: values.category,
      description: values.description.trim(),
      launchDate: values.launchDate,
      initialInvestment: parseAmount(values.initialInvestment),
      responsibleId: values.responsibleId,
      status: values.status,
    })
  }

  const hasErrors = Object.values(errors).some(Boolean)

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AuthInput
        id={`${idPrefix}-name`}
        name="name"
        label="Nom du business"
        placeholder="Ex. Vente de jus naturels"
        icon={StoreIcon}
        value={values.name}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.name}
        autoComplete="off"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelectField
          id={`${idPrefix}-category`}
          name="category"
          label="Catégorie"
          icon={TagIcon}
          value={values.category}
          onChange={handleChange}
          onBlur={handleBlur}
          options={CATEGORY_OPTIONS}
          error={errors.category}
        />
        <FormSelectField
          id={`${idPrefix}-status`}
          name="status"
          label="Statut"
          icon={FlagIcon}
          value={values.status}
          onChange={handleChange}
          onBlur={handleBlur}
          options={BUSINESS_STATUS_OPTIONS}
          error={errors.status}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AuthInput
          id={`${idPrefix}-launch-date`}
          name="launchDate"
          type="date"
          label="Date de lancement"
          icon={CalendarDaysIcon}
          max={todayIso}
          value={values.launchDate}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.launchDate}
        />
        <AuthInput
          id={`${idPrefix}-initial-investment`}
          name="initialInvestment"
          label="Investissement initial (FCFA)"
          placeholder="Ex. 50 000"
          inputMode="numeric"
          icon={WalletIcon}
          value={values.initialInvestment}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.initialInvestment}
          autoComplete="off"
        />
      </div>

      <FormSelectField
        id={`${idPrefix}-responsible`}
        name="responsibleId"
        label="Associé responsable (facultatif)"
        icon={UserIcon}
        value={values.responsibleId}
        onChange={handleChange}
        onBlur={handleBlur}
        options={RESPONSIBLE_OPTIONS}
        error={errors.responsibleId}
      />

      <TextAreaField
        id={`${idPrefix}-description`}
        name="description"
        label="Description (facultative)"
        placeholder="Ex. Vente de jus et de sodas lors des événements"
        maxLength={MAX_BUSINESS_DESCRIPTION_LENGTH}
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

export default BusinessForm
