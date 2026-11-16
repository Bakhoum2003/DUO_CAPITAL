import { MagnifyingGlassIcon, XmarkIcon } from '../../icons'

function SearchInput({ id, label, value, onChange, onClear, placeholder }) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <MagnifyingGlassIcon
        className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        className="h-11 w-full rounded-xl border border-line bg-white pl-11 pr-10 text-sm text-ink outline-none transition placeholder:text-ink-soft focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Effacer la recherche"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-soft transition hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30"
        >
          <XmarkIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export default SearchInput
