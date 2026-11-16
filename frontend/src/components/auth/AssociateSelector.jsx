import { CircleCheckIcon, UserIcon } from '../../icons'
import FormError from '../common/FormError'


function AssociateSelector({ label, name, options, selectedValue, onChange, error, disabled = false }) {
  const labelId = `${name}-label`
  const errorId = `${name}-error`

  return (
    <div>
      <p id={labelId} className="mb-2 text-base font-semibold text-ink">
        {label}
      </p>

      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
        className="flex flex-wrap gap-3"
      >
        {options.map((option) => {
          const isSelected = option.value === selectedValue

          return (
            <label key={option.value} className="cursor-pointer">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                disabled={disabled}
                className="peer sr-only"
              />
              <span
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500/30 ${
                  isSelected
                    ? 'border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-700/20'
                    : 'border-line bg-white text-ink hover:border-brand-500'
                } ${error && !isSelected ? 'border-danger-500' : ''}`}
              >
                <UserIcon className="h-5 w-5" aria-hidden="true" />
                <span>{option.label}</span>
                {isSelected && <CircleCheckIcon className="h-5 w-5" aria-hidden="true" />}
              </span>
            </label>
          )
        })}
      </div>

      <FormError id={errorId} message={error} />
    </div>
  )
}

export default AssociateSelector
