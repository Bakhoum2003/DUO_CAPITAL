import { ChevronDownIcon } from '../../icons'
import FormError from './FormError'

/**
 * Liste déroulante de formulaire, au même style que AuthInput (icône, libellé visible, erreur).
 *
 * Props :
 * - id, name : identifiants du champ
 * - label : libellé affiché au-dessus de la liste
 * - value : valeur choisie ('' = aucune)
 * - onChange, onBlur : contrôle du champ
 * - options : tableau { value, label }
 * - error : message d'erreur (vide = pas d'erreur)
 * - icon : composant d'icône Font Awesome (voir src/icons) affiché à gauche
 */
function FormSelectField({ id, name, label, value, onChange, onBlur, options, error, icon: Icon }) {
  const errorId = `${id}-error`
  const borderStyles = error
    ? 'border-danger-500 focus-within:ring-danger-500/20'
    : 'border-line focus-within:border-brand-500 focus-within:ring-brand-500/20'

  return (
    <div>
      <div className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-2.5 shadow-sm transition focus-within:ring-4 ${borderStyles}`}>
        {Icon && <Icon className="h-6 w-6 shrink-0 text-ink" aria-hidden="true" />}

        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block text-sm font-medium leading-tight text-ink">
            {label}
          </label>
          <select
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className="mt-0.5 block w-full appearance-none border-0 bg-transparent p-0 text-sm text-ink outline-none"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <ChevronDownIcon className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
      </div>

      <FormError id={errorId} message={error} />
    </div>
  )
}

export default FormSelectField
