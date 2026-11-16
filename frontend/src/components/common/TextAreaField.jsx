import FormError from './FormError'

function TextAreaField({ id, name, label, placeholder, value, onChange, onBlur, error, maxLength }) {
  const errorId = `${id}-error`
  const borderStyles = error
    ? 'border-danger-500 focus-within:ring-danger-500/20'
    : 'border-line focus-within:border-brand-500 focus-within:ring-brand-500/20'

  return (
    <div>
      <div className={`rounded-xl border bg-white px-4 py-2.5 shadow-sm transition focus-within:ring-4 ${borderStyles}`}>
        <label htmlFor={id} className="block text-sm font-medium leading-tight text-ink">
          {label}
        </label>
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={3}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="mt-1 block w-full resize-none border-0 bg-transparent p-0 text-sm text-ink outline-none placeholder:text-ink-soft"
        />
        {maxLength && (
          <p className="mt-1 text-right text-xs text-ink-soft" aria-hidden="true">
            {value.length}/{maxLength}
          </p>
        )}
      </div>

      <FormError id={errorId} message={error} />
    </div>
  )
}

export default TextAreaField
