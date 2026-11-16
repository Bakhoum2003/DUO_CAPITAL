import { CheckIcon } from '../../icons'

function CheckboxField({ id, name, label, checked, onChange, disabled = false }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="peer sr-only"
      />
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500/30 ${
          checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-transparent'
        }`}
      >
        <CheckIcon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span>{label}</span>
    </label>
  )
}

export default CheckboxField
