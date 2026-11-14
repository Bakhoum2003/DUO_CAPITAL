import { ChevronDownIcon } from '../../icons'

/**
 * Liste déroulante (filtre ou tri).
 *
 * Props :
 * - id : identifiant du champ
 * - label : libellé accessible (non affiché)
 * - value : valeur choisie
 * - onChange : fonction appelée au changement (reçoit l'événement)
 * - options : tableau { value, label }
 */
function SelectField({ id, label, value, onChange, options }) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="h-11 w-full appearance-none rounded-xl border border-line bg-white pl-4 pr-10 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
        aria-hidden="true"
      />
    </div>
  )
}

export default SelectField
