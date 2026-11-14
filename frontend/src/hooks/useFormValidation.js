import { useCallback, useState } from 'react'

/**
 * Gère les valeurs d'un formulaire et leurs erreurs de validation.
 *
 * @param initialValues valeurs initiales { champ: valeur }
 * @param validate fonction (valeurs) => { champ: 'message' } (uniquement les champs en erreur)
 *
 * - L'erreur d'un champ disparaît dès que l'utilisateur le modifie.
 * - L'erreur d'un champ est calculée quand il perd le focus (onBlur).
 * - validateAll() vérifie tout le formulaire (à appeler à la soumission).
 */
export default function useFormValidation({ initialValues, validate }) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})

  const setFieldValue = useCallback((name, value) => {
    setValues((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => (previous[name] ? { ...previous, [name]: undefined } : previous))
  }, [])

  const handleChange = useCallback(
    (event) => {
      const { name, type, value, checked } = event.target
      setFieldValue(name, type === 'checkbox' ? checked : value)
    },
    [setFieldValue],
  )

  const handleBlur = (event) => {
    const { name } = event.target
    const fieldErrors = validate(values)
    setErrors((previous) => ({ ...previous, [name]: fieldErrors[name] }))
  }

  const validateAll = () => {
    const allErrors = validate(values)
    setErrors(allErrors)
    return Object.keys(allErrors).length === 0
  }

  return { values, errors, handleChange, handleBlur, setFieldValue, validateAll }
}
