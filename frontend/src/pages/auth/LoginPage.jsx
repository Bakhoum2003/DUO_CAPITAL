import { EnvelopeIcon, RightToBracketIcon } from '../../icons'
import { useState } from 'react'
import AuthFormHeader from '../../components/auth/AuthFormHeader'
import AuthInput from '../../components/auth/AuthInput'
import PasswordInput from '../../components/auth/PasswordInput'
import SecurityNotice from '../../components/auth/SecurityNotice'
import FormError from '../../components/common/FormError'
import PrimaryButton from '../../components/common/PrimaryButton'
import useAuth from '../../hooks/useAuth'
import useFormValidation from '../../hooks/useFormValidation'
import { getErrorMessage } from '../../utils/apiErrors'
import { validateLoginForm } from '../../utils/validators'

const INITIAL_VALUES = {
  email: '',
  password: '',
}

const FORGOT_PASSWORD_INFO =
  "La récupération du mot de passe n'est pas encore disponible. Contactez votre associé pour la modifier depuis les paramètres."

/**
 * Page de connexion : validation des champs, puis connexion réelle au serveur (cookies de session HttpOnly).
 * Une fois connecté, PublicOnlyRoute redirige automatiquement vers le dashboard.
 */
function LoginPage() {
  const { login, notice } = useAuth()
  const { values, errors, handleChange, handleBlur, validateAll } = useFormValidation({
    initialValues: INITIAL_VALUES,
    validate: validateLoginForm,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    setInfoMessage('')

    if (!validateAll()) return

    setIsSubmitting(true)
    try {
      await login({ email: values.email.trim(), password: values.password })
    } catch (error) {
      setSubmitError(getErrorMessage(error))
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <AuthFormHeader title="Se connecter" subtitle="Accédez à votre espace DUO CAPITAL" />

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <AuthInput
          id="login-email"
          name="email"
          label="Adresse email"
          type="email"
          placeholder="exemple@gmail.com"
          icon={EnvelopeIcon}
          autoComplete="username"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.email}
          disabled={isSubmitting}
        />

        <PasswordInput
          id="login-password"
          name="password"
          label="Mot de passe"
          placeholder="Votre mot de passe"
          autoComplete="current-password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.password}
          disabled={isSubmitting}
        />

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setInfoMessage(FORGOT_PASSWORD_INFO)}
            className="rounded-md text-sm font-semibold text-brand-600 transition hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30"
          >
            Mot de passe oublié ?
          </button>
        </div>

        <FormError variant="banner" tone="info" message={notice} />
        <FormError variant="banner" message={submitError} />
        <FormError variant="banner" tone="info" message={infoMessage} />

        <PrimaryButton
          type="submit"
          label="Se connecter"
          loadingLabel="Connexion…"
          icon={RightToBracketIcon}
          isLoading={isSubmitting}
        />
      </form>

      <div className="mt-7 space-y-6">
        <SecurityNotice message={'Connexion sécurisée\npar DUO CAPITAL'} />
      </div>
    </>
  )
}

export default LoginPage
