import FormError from '../common/FormError'

/**
 * Champ de formulaire d'authentification : icône à gauche, libellé puis saisie.
 *
 * Props :
 * - id, name : identifiants du champ
 * - label : libellé affiché au-dessus de la saisie
 * - placeholder : texte d'aide dans le champ
 * - type : type d'input HTML (text, email, password…)
 * - value, onChange, onBlur : contrôle du champ
 * - error : message d'erreur (vide = pas d'erreur)
 * - icon : composant d'icône Font Awesome (voir src/icons) affiché à gauche
 * - autoComplete : indication d'auto-complétion du navigateur
 * - disabled : désactive le champ
 * - inputMode : clavier mobile à afficher (ex. 'numeric') (optionnel)
 * - max : valeur maximale, pour un champ date ou nombre (optionnel)
 * - trailingElement : élément affiché à droite (ex. bouton œil du mot de passe)
 */
function AuthInput({
  id,
  name,
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  icon: Icon,
  autoComplete,
  disabled = false,
  inputMode,
  max,
  trailingElement = null,
}) {
  const errorId = `${id}-error`
  const borderStyles = error
    ? 'border-danger-500 focus-within:ring-danger-500/20'
    : 'border-line focus-within:border-brand-500 focus-within:ring-brand-500/20'

  return (
    <div>
      <div
        className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-2.5 shadow-sm transition focus-within:ring-4 ${borderStyles} ${
          disabled ? 'opacity-60' : ''
        }`}
      >
        {Icon && <Icon className="h-6 w-6 shrink-0 text-ink" aria-hidden="true" />}

        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block text-sm font-medium leading-tight text-ink">
            {label}
          </label>
          <input
            id={id}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            autoComplete={autoComplete}
            inputMode={inputMode}
            max={max}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className="mt-0.5 block w-full border-0 bg-transparent p-0 text-sm text-ink outline-none placeholder:text-ink-soft"
          />
        </div>

        {trailingElement}
      </div>

      <FormError id={errorId} message={error} />
    </div>
  )
}

export default AuthInput
