import { useContext } from 'react'
import { PreferencesContext } from '../context/PreferencesContext'

/** Préférences personnelles : { status, preferences, errorMessage, isSaving, notice, update, reset, reload }. */
export default function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) throw new Error('usePreferences doit être utilisé sous <PreferencesProvider>.')
  return context
}
