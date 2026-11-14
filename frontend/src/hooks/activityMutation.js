import { describeActivityError } from '../utils/activitiesViewModel'

export const IDLE_MUTATION = Object.freeze({ status: 'idle', message: '', fieldErrors: {} })

/**
 * Exécute une écriture (création, modification, changement de statut) au plus une fois à la fois.
 * `guard` : { current: boolean } partagé par le hook (aucune double soumission). Ne lève jamais d'erreur.
 * @returns {Promise<{ ok: true, data: unknown } | { ok: false }>}
 */
export async function runMutation(call, { guard, setMutation }) {
  if (guard.current) return { ok: false }
  guard.current = true
  setMutation({ ...IDLE_MUTATION, status: 'submitting' })
  try {
    const data = await call()
    setMutation(IDLE_MUTATION)
    return { ok: true, data }
  } catch (error) {
    setMutation({ status: 'error', ...describeActivityError(error) })
    return { ok: false }
  } finally {
    guard.current = false
  }
}
