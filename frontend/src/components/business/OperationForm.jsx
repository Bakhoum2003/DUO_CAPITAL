import { CalendarDaysIcon, TagIcon, WalletIcon } from '../../icons'
import {
  BUSINESS_ASSOCIATES,
  EXPENSE_CATEGORIES,
  MAX_OPERATION_DESCRIPTION_LENGTH,
  OPERATION_TYPES,
} from '../../constants/businessSettings'
import useFormValidation from '../../hooks/useFormValidation'
import { validateOperationForm } from '../../utils/businessValidators'
import { parseAmount } from '../../utils/contributionValidators'
import AssociateSelector from '../auth/AssociateSelector'
import AuthInput from '../auth/AuthInput'
import ActionButton from '../common/ActionButton'
import FormSelectField from '../common/FormSelectField'
import TextAreaField from '../common/TextAreaField'

const ASSOCIATE_OPTIONS = BUSINESS_ASSOCIATES.map((associate) => ({ value: associate.id, label: associate.name }))
const ASSOCIATE_IDS = BUSINESS_ASSOCIATES.map((associate) => associate.id)
const EXPENSE_CATEGORY_OPTIONS = [{ value: '', label: 'Choisir une catégorie' }, ...EXPENSE_CATEGORIES]
const EXPENSE_CATEGORY_VALUES = EXPENSE_CATEGORIES.map((category) => category.value)

function OperationForm({ idPrefix, operationType, initialValues, todayIso, launchDate, submitLabel, onSubmit, onCancel }) {
  const { values, errors, handleChange, handleBlur, setFieldValue, validateAll } = useFormValidation({
    initialValues,
    validate: (formValues) =>
      validateOperationForm(
        { ...formValues, type: operationType },
        { todayIso, launchDate, associateIds: ASSOCIATE_IDS, expenseCategoryValues: EXPENSE_CATEGORY_VALUES },
      ),
  })

  const isExpense = operationType === 'expense'

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!validateAll()) return

    onSubmit({
      type: operationType,
      amount: parseAmount(values.amount),
      date: values.date,
      associateId: values.associateId,
      expenseCategory: isExpense ? values.expenseCategory : '',
      description: values.description.trim(),
    })
  }

  const hasErrors = Object.values(errors).some(Boolean)

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AssociateSelector
        label={OPERATION_TYPES[operationType].associateLabel}
        name={`${idPrefix}-associate`}
        options={ASSOCIATE_OPTIONS}
        selectedValue={values.associateId}
        onChange={(value) => setFieldValue('associateId', value)}
        error={errors.associateId}
      />

      <div className="grid gap-4 sm:grid-cols-2">
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
          label="Date"
          icon={CalendarDaysIcon}
          max={todayIso}
          value={values.date}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.date}
        />
      </div>

      {isExpense && (
        <FormSelectField
          id={`${idPrefix}-expense-category`}
          name="expenseCategory"
          label="Catégorie de dépense"
          icon={TagIcon}
          value={values.expenseCategory}
          onChange={handleChange}
          onBlur={handleBlur}
          options={EXPENSE_CATEGORY_OPTIONS}
          error={errors.expenseCategory}
        />
      )}

      <TextAreaField
        id={`${idPrefix}-description`}
        name="description"
        label="Description (facultative)"
        placeholder="Ex. Achat de cartons de boissons"
        maxLength={MAX_OPERATION_DESCRIPTION_LENGTH}
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

export default OperationForm
