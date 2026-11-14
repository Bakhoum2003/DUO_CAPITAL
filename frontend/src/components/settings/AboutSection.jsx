import { CircleInfoIcon } from '../../icons'
import HandshakeIcon from '../common/HandshakeIcon'
import SettingsSection from './SettingsSection'

/**
 * À propos : logo, nom, version et slogan de l'application.
 *
 * Props :
 * - appName, version, slogan, aboutText : informations de l'application
 */
function AboutSection({ appName, version, slogan, aboutText }) {
  return (
    <SettingsSection
      icon={CircleInfoIcon}
      title="À propos"
      contentElement={
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
          <HandshakeIcon className="h-16 w-24 shrink-0" />
          <div className="min-w-0">
            <p className="text-xl font-extrabold text-brand-700">{appName}</p>
            <p className="text-sm text-ink-soft">Version {version}</p>
            <p className="mt-1 text-sm font-semibold italic text-ink">{slogan}</p>
            <p className="mt-2 text-sm text-ink-soft">{aboutText}</p>
          </div>
        </div>
      }
    />
  )
}

export default AboutSection
