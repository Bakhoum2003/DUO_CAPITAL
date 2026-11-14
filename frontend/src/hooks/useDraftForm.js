import { useCallback, useState } from 'react'
import { areValuesEqual } from '../utils/settingsValidators'

/**
 * Brouillon d'un formulaire : l'utilisateur modifie une copie, rien n'est appliqué avant l'enregistrement.
 * Quand les valeurs enregistrées changent (enregistrement, réinitialisation), le brouillon repart de celles-ci.
 *
 * @param savedValues valeurs actuellement enregistrées (même référence tant qu'elles ne changent pas)
 * @param validate fonction (valeurs) => { isValid, errors, values }
 * Retourne { values, errors, isDirty, setField, cancel, submit }.
 * submit() valide : retourne les valeurs nettoyées, ou null (les erreurs sont alors affichées).
 */
export default function useDraftForm({ savedValues, validate }) {
  const [baseline, setBaseline] = useState(savedValues)
  const [values, setValues] = useState(savedValues)
  const [errors, setErrors] = useState({})

  if (baseline !== savedValues) {
    setBaseline(savedValues)
    setValues(savedValues)
    setErrors({})
  }

  const setField = useCallback((name, value) => {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }, [])

  const cancel = useCallback(() => {
    setValues(savedValues)
    setErrors({})
  }, [savedValues])

  const submit = useCallback(() => {
    const result = validate(values)
    setErrors(result.errors)
    return result.isValid ? result.values : null
  }, [validate, values])

  return { values, errors, isDirty: !areValuesEqual(values, savedValues), setField, cancel, submit }
}
