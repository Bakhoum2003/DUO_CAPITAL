import { EyeIcon, EyeSlashIcon, LockIcon } from '../../icons'
import usePasswordVisibility from '../../hooks/usePasswordVisibility'
import AuthInput from './AuthInput'

/**
 * Champ mot de passe avec bouton pour afficher / masquer la saisie.
 * Mêmes props que AuthInput (sans type, icon et trailingElement).
 */
function PasswordInput({
  id,
  name,
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  autoComplete,
  disabled = false,
}) {
  const { isVisible, toggleVisibility, inputType } = usePasswordVisibility()
  const VisibilityIcon = isVisible ? EyeIcon : EyeSlashIcon

  const visibilityButton = (
    <button
      type="button"
      onClick={toggleVisibility}
      disabled={disabled}
      aria-label={isVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      aria-pressed={isVisible}
      className="shrink-0 rounded-md p-1 text-ink transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30"
    >
      <VisibilityIcon className="h-6 w-6" aria-hidden="true" />
    </button>
  )

  return (
    <AuthInput
      id={id}
      name={name}
      label={label}
      placeholder={placeholder}
      type={inputType}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      error={error}
      icon={LockIcon}
      autoComplete={autoComplete}
      disabled={disabled}
      trailingElement={visibilityButton}
    />
  )
}

export default PasswordInput
