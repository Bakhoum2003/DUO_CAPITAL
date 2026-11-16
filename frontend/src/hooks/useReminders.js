import { useContext } from 'react'
import { RemindersContext } from '../context/RemindersContext'

export default function useReminders() {
  const context = useContext(RemindersContext)
  if (!context) throw new Error('useReminders doit être utilisé sous <RemindersProvider>.')
  return context
}
