import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import usePreferences from '../hooks/usePreferences'
import { settingsApi } from '../services/settingsApi'
import { getErrorMessage } from '../utils/apiErrors'
import { buildReminderView } from '../utils/settingsViewModel'

export const RemindersContext = createContext(null)

const EMPTY_VIEW = buildReminderView(null)

function RemindersProvider() {
  const { preferences, status } = usePreferences()
  const { pathname } = useLocation()
  const remindersEnabled = status !== 'loading' && preferences.contributionRemindersEnabled
  const [state, setState] = useState({ status: 'idle', view: EMPTY_VIEW, errorMessage: '' })
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!remindersEnabled) return undefined
    let cancelled = false
    setState((current) => ({ ...current, status: 'loading', errorMessage: '' }))
    settingsApi
      .getContributionReminders()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', view: buildReminderView(data), errorMessage: '' })
      })
      .catch((error) => {
        if (!cancelled) setState((current) => ({ ...current, status: 'error', errorMessage: getErrorMessage(error) }))
      })
    return () => {
      cancelled = true
    }
  }, [remindersEnabled, pathname, reloadToken])

  const refresh = useCallback(() => setReloadToken((token) => token + 1), [])

  const value = useMemo(
    () =>
      remindersEnabled
        ? { status: state.status, view: state.view, errorMessage: state.errorMessage, refresh }
        : { status: 'disabled', view: EMPTY_VIEW, errorMessage: '', refresh },
    [remindersEnabled, state, refresh],
  )

  return (
    <RemindersContext.Provider value={value}>
      <Outlet />
    </RemindersContext.Provider>
  )
}

export default RemindersProvider
