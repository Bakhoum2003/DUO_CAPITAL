function DateInput({ id, label, value, onChange, min, max }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20"
      />
    </div>
  )
}

export default DateInput
