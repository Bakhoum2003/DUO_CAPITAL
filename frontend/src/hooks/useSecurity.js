import { useCallback, useEffect, useState } from 'react'
import { settingsApi } from '../services/settingsApi'
import { getErrorMessage } from '../utils/apiErrors'
import { toSecurityView } from '../utils/settingsViewModel'

/** Sécurité du compte connecté (GET /api/v1/settings/security) : { status, view, errorMessage, refresh }. */
export default function useSecurity() {
  const [state, setState] = useState({ status: 'loading', view: null, errorMessage: '' })
  const [token, setToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    settingsApi
      .getSecurity()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', view: toSecurityView(data), errorMessage: '' })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', view: null, errorMessage: getErrorMessage(error) })
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const refresh = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading', errorMessage: '' }))
    setToken((value) => value + 1)
  }, [])

  return { ...state, refresh }
}
