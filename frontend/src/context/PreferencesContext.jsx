import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { settingsApi } from '../services/settingsApi'
import { applyPreferences, resetAppearance } from '../services/settingsService'
import { getErrorMessage } from '../utils/apiErrors'
import { DEFAULT_PREFERENCES, normalizePreferences } from '../utils/settingsViewModel'

export const PreferencesContext = createContext(null)

const NOTICE_DURATION_MS = 4000

/**
 * Préférences personnelles de l'associé connecté, lues dans MongoDB après l'authentification (GET /settings/preferences).
 * Utilisé comme route « layout » sous RequireAuth. Rien n'est stocké dans le navigateur.
 * - le thème et le format des montants sont appliqués dès la réponse du serveur, avant d'afficher les pages (pas de flash) ;
 * - à chaque changement du format des montants, les pages sont remontées : tous les montants se rafraîchissent sans déconnexion ;
 * - à la déconnexion (démontage), l'apparence revient au thème clair neutre : un associé ne garde jamais le thème de l'autre.
 */
function PreferencesProvider() {
  const [state, setState] = useState({ status: 'loading', preferences: DEFAULT_PREFERENCES, errorMessage: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const savingRef = useRef(false)

  const load = useCallback(async (isCancelled = () => false) => {
    setState((current) => ({ ...current, status: 'loading', errorMessage: '' }))
    try {
      const data = await settingsApi.getPreferences()
      if (isCancelled()) return
      const preferences = normalizePreferences(data?.preferences)
      applyPreferences(preferences)
      setState({ status: 'ready', preferences, errorMessage: '' })
    } catch (error) {
      if (isCancelled()) return
      applyPreferences(DEFAULT_PREFERENCES)
      setState({ status: 'error', preferences: DEFAULT_PREFERENCES, errorMessage: getErrorMessage(error) })
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    load(() => cancelled)
    return () => {
      cancelled = true
      resetAppearance()
    }
  }, [load])

  useEffect(() => {
    if (!notice) return undefined
    const timerId = setTimeout(() => setNotice(''), NOTICE_DURATION_MS)
    return () => clearTimeout(timerId)
  }, [notice])

  const update = useCallback(async (changes) => {
    if (savingRef.current) return { ok: false, message: 'Une modification est déjà en cours.' }
    savingRef.current = true
    setIsSaving(true)
    try {
      const data = await settingsApi.updatePreferences(changes)
      const preferences = normalizePreferences(data?.preferences)
      applyPreferences(preferences)
      setState({ status: 'ready', preferences, errorMessage: '' })
      setNotice('Préférences enregistrées.')
      return { ok: true }
    } catch (error) {
      return { ok: false, message: getErrorMessage(error) }
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }, [])

  // Réinitialise uniquement les préférences personnelles de l'associé connecté (jamais les paramètres communs).
  const reset = useCallback(async () => {
    if (savingRef.current) return { ok: false, message: 'Une modification est déjà en cours.' }
    savingRef.current = true
    setIsSaving(true)
    try {
      const data = await settingsApi.resetPreferences()
      const preferences = normalizePreferences(data?.preferences)
      applyPreferences(preferences)
      setState({ status: 'ready', preferences, errorMessage: '' })
      setNotice('Vos préférences personnelles ont été réinitialisées.')
      return { ok: true }
    } catch (error) {
      return { ok: false, message: getErrorMessage(error) }
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }, [])

  const value = useMemo(
    () => ({
      status: state.status,
      preferences: state.preferences,
      errorMessage: state.errorMessage,
      isSaving,
      notice,
      update,
      reset,
      reload: () => load(),
    }),
    [state, isSaving, notice, update, reset, load],
  )

  if (state.status === 'loading') {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center bg-[#f6f9f7] text-sm text-[#5b6b7c]">
        Chargement de vos préférences…
      </div>
    )
  }

  return (
    <PreferencesContext.Provider value={value}>
      {/* La clé remonte les pages quand le format des montants change : tous les montants sont recalculés. */}
      <Outlet key={state.preferences.amountSeparator} />
    </PreferencesContext.Provider>
  )
}

export default PreferencesProvider
