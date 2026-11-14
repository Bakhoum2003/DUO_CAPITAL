import { useContext } from 'react'
import { RemindersContext } from '../context/RemindersContext'

/** Rappels de cotisation : { status: 'disabled'|'idle'|'loading'|'ready'|'error', view, errorMessage, refresh }. */
export default function useReminders() {
  const context = useContext(RemindersContext)
  if (!context) throw new Error('useReminders doit être utilisé sous <RemindersProvider>.')
  return context
}
