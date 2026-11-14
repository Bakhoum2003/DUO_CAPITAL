import { RightFromBracketIcon } from '../../icons'
import ConfirmDialog from '../common/ConfirmDialog'

/**
 * Confirmation avant la déconnexion. Réutilise ConfirmDialog : Annuler, Échap et le clic en dehors
 * de la fenêtre la ferment ; « Se déconnecter » lance la déconnexion existante.
 *
 * Props :
 * - isSubmitting : déconnexion en cours (boutons désactivés, fenêtre non fermable)
 * - onConfirm : fonction appelée au clic sur « Se déconnecter »
 * - onClose : fonction appelée pour annuler
 */
function LogoutConfirmDialog({ isSubmitting = false, onConfirm, onClose }) {
  return (
    <ConfirmDialog
      idPrefix="logout"
      title="Déconnexion"
      description="Êtes-vous sûr de vouloir vous déconnecter de votre compte ?"
      confirmLabel="Se déconnecter"
      icon={RightFromBracketIcon}
      confirmVariant="primary"
      isSubmitting={isSubmitting}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}

export default LogoutConfirmDialog
