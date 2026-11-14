/**
 * Enveloppe la déconnexion existante avec une garde synchrone : tant qu'une déconnexion est en cours,
 * les appels suivants (double clic) ne la relancent pas et renvoient { ok: false, skipped: true }.
 * La garde est relâchée seulement si la déconnexion échoue (l'utilisateur peut alors réessayer) ;
 * si elle réussit, la session disparaît et l'application revient à la connexion.
 *
 * @param logout fonction de déconnexion existante (renvoie { ok, message })
 */
export function createLogoutRunner(logout) {
  let inFlight = false

  return async function runLogout() {
    if (inFlight) return { ok: false, skipped: true }
    inFlight = true
    try {
      const result = await logout()
      if (!result.ok) inFlight = false
      return result
    } catch (error) {
      inFlight = false
      throw error
    }
  }
}
