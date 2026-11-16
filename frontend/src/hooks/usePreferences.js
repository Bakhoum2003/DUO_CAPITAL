import { useContext } from 'react'
import { PreferencesContext } from '../context/PreferencesContext'

export default function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) throw new Error('usePreferences doit être utilisé sous <PreferencesProvider>.')
  return context
}
