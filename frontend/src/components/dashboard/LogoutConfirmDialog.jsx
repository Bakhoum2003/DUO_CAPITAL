import { RightFromBracketIcon } from '../../icons'
import ConfirmDialog from '../common/ConfirmDialog'

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
