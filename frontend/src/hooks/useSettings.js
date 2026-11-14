import { useCallback, useEffect, useRef, useState } from 'react'
import { settingsApi } from '../services/settingsApi'
import { getErrorMessage } from '../utils/apiErrors'
import { buildSettingsUpdate, getSettingsErrorMessage, toSettingsView } from '../utils/settingsViewModel'

/**
 * Paramètres communs aux deux associés (GET/PUT /api/v1/settings). Source de vérité : le serveur.
 * Retourne { status: 'loading'|'ready'|'error', view, errorMessage, isSaving, save, refresh }.
 * save(values) : envoie uniquement les champs modifiés avec la version connue ; en cas de conflit (409), les
 * valeurs à jour sont rechargées. Une seule sauvegarde à la fois (anti double soumission).
 */
export default function useSettings() {
  const [state, setState] = useState({ status: 'loading', view: null, errorMessage: '' })
  const [isSaving, setIsSaving] = useState(false)
  const savingRef = useRef(false)
  const viewRef = useRef(null)

  const fetchSettings = useCallback(async (isCancelled = () => false) => {
    try {
      const view = toSettingsView(await settingsApi.getSettings())
      if (isCancelled()) return view
      viewRef.current = view
      setState({ status: 'ready', view, errorMessage: '' })
      return view
    } catch (error) {
      if (!isCancelled()) setState((current) => ({ ...current, status: viewRef.current ? 'ready' : 'error', errorMessage: getErrorMessage(error) }))
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchSettings(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [fetchSettings])

  const refresh = useCallback(() => {
    setState((current) => ({ ...current, status: viewRef.current ? 'ready' : 'loading', errorMessage: '' }))
    return fetchSettings()
  }, [fetchSettings])

  const save = useCallback(
    async (values) => {
      const current = viewRef.current
      if (!current || savingRef.current) return { ok: false, message: 'Enregistrement impossible pour le moment.' }
      const body = buildSettingsUpdate({ expectedVersion: current.version, values, saved: current.values })
      if (!body) return { ok: true, unchanged: true }

      savingRef.current = true
      setIsSaving(true)
      try {
        await settingsApi.updateSettings(body)
        await fetchSettings()
        return { ok: true }
      } catch (error) {
        if (error?.status === 409) await fetchSettings()
        return { ok: false, conflict: error?.status === 409, message: getSettingsErrorMessage(error) }
      } finally {
        savingRef.current = false
        setIsSaving(false)
      }
    },
    [fetchSettings],
  )

  return { status: state.status, view: state.view, errorMessage: state.errorMessage, isSaving, save, refresh }
}
