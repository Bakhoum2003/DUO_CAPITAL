function OperationTypeFilter({ value, options, onChange }) {
  return (
    <div role="group" aria-label="Filtrer par type d'opération" className="mb-4 flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = option.value === value

        return (
          <button
            key={option.value || 'all'}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30 ${
              isSelected
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-line bg-white text-ink hover:bg-surface'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default OperationTypeFilter
