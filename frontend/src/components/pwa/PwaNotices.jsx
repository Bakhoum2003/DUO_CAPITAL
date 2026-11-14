import { useState } from 'react'
import { ArrowsRotateIcon, DownloadIcon, PlugCircleXmarkIcon, XmarkIcon } from '../../icons'
import usePwa from '../../hooks/usePwa'
import { selectNotices } from '../../pwa/pwaStore'
import ActionButton from '../common/ActionButton'
import IconButton from '../common/IconButton'

const CARD = 'flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm'

/**
 * Notices PWA : connexion perdue, nouvelle version disponible, invitation d'installation.
 * N'affiche rien lorsqu'il n'y a rien à signaler.
 *
 * Props :
 * - className : classes du conteneur (espacement choisi par la page qui l'accueille)
 */
function PwaNotices({ className = '' }) {
  const pwa = usePwa()
  const [isUpdating, setIsUpdating] = useState(false)
  const notices = selectNotices(pwa)

  if (!notices.offline && !notices.update && !notices.install && !notices.manualInstall) return null

  const handleUpdate = async () => {
    if (isUpdating) return
    setIsUpdating(true)
    try {
      await pwa.applyUpdate()
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className={className}>
      {notices.offline && (
        <div role="status" className={`${CARD} border-amber-200 bg-amber-50 text-amber-700`}>
          <PlugCircleXmarkIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            <strong>Vous êtes hors connexion.</strong> L'interface reste disponible, mais les données et toutes les opérations
            financières nécessitent une connexion au serveur : rien n'est enregistré tant que vous êtes déconnecté d'Internet.
          </p>
        </div>
      )}

      {notices.update && (
        <div role="status" className={`${CARD} border-brand-200 bg-brand-50 text-ink`}>
          <ArrowsRotateIcon className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            <strong>Une nouvelle version de DUO CAPITAL est disponible.</strong> Terminez votre saisie en cours, puis actualisez
            pour l'appliquer.
          </p>
          <ActionButton label="Actualiser" size="sm" onClick={handleUpdate} disabled={isUpdating} />
          <ActionButton label="Plus tard" size="sm" variant="secondary" onClick={pwa.dismissUpdate} disabled={isUpdating} />
        </div>
      )}

      {notices.install && (
        <div role="region" aria-label="Installer l'application" className={`${CARD} border-brand-200 bg-brand-50 text-ink`}>
          <DownloadIcon className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            <strong>Installez DUO CAPITAL</strong> sur cet appareil pour la lancer depuis une icône, comme une application.
          </p>
          <ActionButton label="Installer l'application" icon={DownloadIcon} size="sm" onClick={pwa.promptInstall} />
          <IconButton icon={XmarkIcon} label="Masquer l'invitation d'installation" onClick={pwa.dismissInstall} />
        </div>
      )}

      {notices.manualInstall && (
        <div role="region" aria-label="Installer l'application" className={`${CARD} border-brand-200 bg-brand-50 text-ink`}>
          <DownloadIcon className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            <strong>Installer DUO CAPITAL :</strong> dans Safari, touchez « Partager », puis « Sur l'écran d'accueil ».
          </p>
          <IconButton icon={XmarkIcon} label="Masquer l'explication d'installation" onClick={pwa.dismissInstall} />
        </div>
      )}
    </div>
  )
}

export default PwaNotices
